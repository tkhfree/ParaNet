"""ONOS Java application code emitter — generates complete ONOS app from ControlIR."""

from __future__ import annotations

from compiler.ir.poly_control_ir import ControlIR


def emit_onos_app(ir: ControlIR) -> dict[str, str]:
    """Generate ONOS application source files from ControlIR.

    Returns:
        dict mapping file path to file content.
    """
    pkg = ir.app.package_name or "org.paranet.app"
    pkg_path = pkg.replace(".", "/")
    class_name = _app_name_to_class(ir.app.name)
    artifact_id = ir.app.name.split(".")[-1] if "." in ir.app.name else ir.app.name

    files: dict[str, str] = {}

    # 1. app.xml — ONOS app descriptor
    files[f"src/main/resources/app.xml"] = _render_app_xml(ir, pkg, class_name)

    # 2. pom.xml — Maven build
    files["pom.xml"] = _render_pom_xml(ir, pkg, artifact_id)

    # 3. Main component class
    files[f"src/main/java/{pkg_path}/{class_name}.java"] = _render_component(ir, pkg, class_name)

    # 4. Event listener classes
    for handler in ir.event_handlers:
        listener_class = f"{handler.method_name}Listener"
        files[f"src/main/java/{pkg_path}/{listener_class}.java"] = _render_event_listener(ir, pkg, listener_class, handler.event_class, handler.event_name)

    return files


def _render_app_xml(ir: ControlIR, pkg: str, class_name: str) -> str:
    features_xml = "\n        ".join(f'<feature>{f}</feature>' for f in ir.app.features)
    apps_xml = ""
    if ir.app.apps:
        apps_xml = "\n        " + "\n        ".join(f'<app>{a}</app>' for a in ir.app.apps)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<app name="{ir.app.name}"
     origin="ParaNet"
     version="{ir.app.version}"
     category="Utility"
     url="https://paranet.org"
     featuresRoot="{pkg}"
     features="{ir.app.name}">
    <description>{ir.app.description}</description>
    <features>
        {features_xml}
    </features>{f'''
    <apps>{apps_xml}
    </apps>''' if apps_xml else ""}
</app>
"""


def _render_pom_xml(ir: ControlIR, pkg: str, artifact_id: str) -> str:
    onos_ver = ir.app.onos_version or "2.7"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>{pkg}</groupId>
    <artifactId>{artifact_id}</artifactId>
    <version>{ir.app.version}</version>
    <packaging>bundle</packaging>

    <dependencies>
        <dependency>
            <groupId>org.onosproject</groupId>
            <artifactId>onos-api</artifactId>
            <version>{onos_ver}</version>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.onosproject</groupId>
            <artifactId>onlab-misc</artifactId>
            <version>{onos_ver}</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.felix</groupId>
                <artifactId>maven-bundle-plugin</artifactId>
                <version>5.1.9</version>
                <extensions>true</extensions>
                <configuration>
                    <instructions>
                        <Bundle-SymbolicName>{pkg}.{artifact_id}</Bundle-SymbolicName>
                        <_wab>src/main/webapp</_wab>
                        <Embed-Dependency>*</Embed-Dependency>
                    </instructions>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
"""


def _render_component(ir: ControlIR, pkg: str, class_name: str) -> str:
    imports = [
        "import org.osgi.service.component.annotations.*;",
        "import org.onosproject.core.ApplicationId;",
        "import org.onosproject.core.CoreService;",
        "import org.onosproject.net.device.*;",
        "import org.onosproject.net.link.*;",
        "import org.onosproject.net.topology.*;",
        "import org.onosproject.net.flow.*;",
        "import org.onosproject.net.HostId;",
        "import org.onosproject.cluster.*;",
        "import org.slf4j.*;",
        "import java.util.concurrent.*;",
    ]

    # State fields
    state_fields = []
    for s in ir.states:
        state_fields.append(f"    // Distributed store: {s.name}")
        state_fields.append(f"    // Type: {s.java_type}")
        state_fields.append(f"    private volatile {s.java_type} {s.name};")
        state_fields.append("")

    # References
    refs = [
        '    @Reference(cardinality = ReferenceCardinality.MANDATORY)',
        '    protected CoreService coreService;',
        '',
        '    @Reference(cardinality = ReferenceCardinality.MANDATORY)',
        '    protected DeviceService deviceService;',
        '',
        '    @Reference(cardinality = ReferenceCardinality.MANDATORY)',
        '    protected DeviceAdminService deviceAdminService;',
        '',
        '    @Reference(cardinality = ReferenceCardinality.MANDATORY)',
        '    protected FlowRuleService flowRuleService;',
        '',
    ]

    # Activate method
    activate_body = [
        f'        appId = coreService.registerApplication("{ir.app.name}");',
        '        log.info("{} started", appId);',
    ]

    # Register event listeners
    for handler in ir.event_handlers:
        listener_class = f"{handler.method_name}Listener"
        activate_body.append(f"        {listener_class} listener = new {listener_class}(this);")
        activate_body.append(f"        // Register listener for {handler.event_name}")
        activate_body.append("")

    # Register periodic tasks
    for task in ir.periodic_tasks:
        activate_body.append(f"        scheduler.scheduleAtFixedRate(")
        activate_body.append(f"            this::{task.method_name},")
        activate_body.append(f"            {task.every_ms}, {task.every_ms}, TimeUnit.MILLISECONDS);")

    # Periodic task methods
    periodic_methods = []
    for task in ir.periodic_tasks:
        body_lines = [f'        log.debug("Periodic task: {task.name}");'] + \
                     [f'        {a}' for a in task.actions]
        periodic_methods.append(f"""
    private void {task.method_name}() {{
{''.join(chr(10) + l for l in body_lines)}
    }}""")

    # Event handler methods
    event_methods = []
    for handler in ir.event_handlers:
        body_lines = [f'        log.info("Event: {handler.event_name}");'] + \
                     [f'        {a}' for a in handler.actions]
        params = ", ".join(handler.params)
        event_methods.append(f"""
    public void handle{handler.method_name}({params}) {{
{''.join(chr(10) + l for l in body_lines)}
    }}""")

    # Deactivate
    deactivate_body = [
        '        scheduler.shutdownNow();',
        '        log.info("{} stopped", appId);',
    ]

    # Flow push methods
    flow_methods = []
    for fp in ir.flow_pushes:
        flow_methods.append(f"""
    public void pushFlowRules() {{
        // Push flow rules from {fp.rules_ref} via {fp.via}
        // TODO: implement flow rule installation based on data plane modules
        log.info("Flow rule push to {{}} via {{}}", "{fp.target}", "{fp.via}");
    }}""")

    all_imports = "\n".join(sorted(set(imports)))
    all_refs = "\n".join(refs)
    all_state = "\n".join(state_fields)
    all_activate = "\n".join(activate_body)
    all_deactivate = "\n".join(deactivate_body)
    all_periodic = "\n".join(periodic_methods)
    all_events = "\n".join(event_methods)
    all_flow = "\n".join(flow_methods)

    return f"""package {pkg};

{all_imports}

/**
 * {ir.app.description}
 * <p>
 * Generated by ParaNet Polymorphic DSL Compiler.
 */
@Component(immediate = true)
public class {class_name} {{

    private final Logger log = LoggerFactory.getLogger({class_name}.class);
    private ApplicationId appId;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

{all_refs}
{all_state}
    @Activate
    protected void activate() {{
{all_activate}
    }}

    @Deactivate
    protected void deactivate() {{
{all_deactivate}
    }}
{all_periodic}
{all_events}
{all_flow}
}}
"""


def _render_event_listener(ir: ControlIR, pkg: str, class_name: str, event_class: str, event_name: str) -> str:
    """Generate an event listener inner class."""
    pkg_ref = _app_name_to_class(ir.app.name)

    return f"""package {pkg};

import org.onosproject.net.{event_class.lower().replace("event", "").strip()}.*;
import org.onosproject.net.device.DeviceEvent;
import org.onosproject.net.device.DeviceListener;
import org.onosproject.net.link.LinkEvent;
import org.onosproject.net.link.LinkListener;
import org.onosproject.net.topology.TopologyEvent;
import org.onosproject.net.topology.TopologyListener;
import org.slf4j.*;

/**
 * Event listener for {event_name}.
 * Generated by ParaNet Polymorphic DSL Compiler.
 */
public class {class_name} implements DeviceListener, LinkListener, TopologyListener {{

    private final Logger log = LoggerFactory.getLogger({class_name}.class);
    private final {pkg_ref} component;

    public {class_name}({pkg_ref} component) {{
        this.component = component;
    }}

    @Override
    public void event(DeviceEvent event) {{
        log.debug("DeviceEvent: {{}}", event.type());
        switch (event.type()) {{
            case DEVICE_ADDED:
            case DEVICE_AVAILABILITY_CHANGED:
                component.handle{class_name}(event);
                break;
            default:
                break;
        }}
    }}

    @Override
    public void event(LinkEvent event) {{
        log.debug("LinkEvent: {{}}", event.type());
        component.handle{class_name}(event);
    }}

    @Override
    public void event(TopologyEvent event) {{
        log.debug("TopologyEvent");
        component.handle{class_name}(event);
    }}
}}
"""


def _app_name_to_class(name: str) -> str:
    segment = name.split(".")[-1] if "." in name else name
    import re
    parts = re.split(r"[-_]", segment)
    return "".join(p.capitalize() for p in parts) + "AppComponent"


__all__ = ["emit_onos_app"]

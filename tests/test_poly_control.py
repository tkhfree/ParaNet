"""Tests for Polymorphic DSL Control IR, Collector, and ONOS Emitter."""

from compiler.frontend.poly_parser import PolyParser
from compiler.frontend.poly_ast import (
    AppMetaNode,
    ControlBlockNode,
    OnEventNode,
    PeriodicNode,
    StateDeclNode,
    DiscoveryNode,
    ProviderEntryNode,
    FlowPushNode,
)
from compiler.semantic.poly_control_collector import (
    collect_control,
    _type_expr_to_java,
    _parse_interval_to_ms,
    _event_name_to_class,
    _app_name_to_package,
    _app_name_to_class,
)
from compiler.backend.onos_emitter import emit_onos_app
from compiler.ir.poly_control_ir import (
    ControlIR,
    OnosAppMeta,
    OnosStateDecl,
    OnosEventHandler,
    OnosPeriodicTask,
    OnosFlowPush,
)


# ---------------------------------------------------------------------------
# _type_expr_to_java
# ---------------------------------------------------------------------------

class TestTypeExprToJava:
    def test_int(self):
        assert _type_expr_to_java("int") == "Integer"

    def test_integer(self):
        assert _type_expr_to_java("integer") == "Integer"

    def test_bool(self):
        assert _type_expr_to_java("bool") == "Boolean"

    def test_boolean(self):
        assert _type_expr_to_java("boolean") == "Boolean"

    def test_string(self):
        assert _type_expr_to_java("string") == "String"

    def test_float(self):
        assert _type_expr_to_java("float") == "Double"

    def test_double(self):
        assert _type_expr_to_java("double") == "Double"

    def test_long(self):
        assert _type_expr_to_java("long") == "Long"

    def test_map(self):
        assert _type_expr_to_java("map<string, int>") == "Map<String, Integer>"

    def test_map_nested(self):
        assert _type_expr_to_java("map<string, map<string, string>>") == "Map<String, Map<String, String>>"

    def test_set(self):
        assert _type_expr_to_java("set<int>") == "Set<Integer>"

    def test_list(self):
        assert _type_expr_to_java("list<string>") == "List<String>"

    def test_unknown_returns_string(self):
        assert _type_expr_to_java("custom_type") == "String"

    def test_empty_map(self):
        assert _type_expr_to_java("map") == "Map<String, String>"


# ---------------------------------------------------------------------------
# _parse_interval_to_ms
# ---------------------------------------------------------------------------

class TestParseInterval:
    def test_milliseconds(self):
        assert _parse_interval_to_ms("100ms") == 100

    def test_seconds(self):
        assert _parse_interval_to_ms("5s") == 5000

    def test_minutes(self):
        assert _parse_interval_to_ms("1m") == 60000

    def test_seconds_float(self):
        assert _parse_interval_to_ms("2.5s") == 2500

    def test_plain_number(self):
        assert _parse_interval_to_ms("3000") == 3000

    def test_whitespace(self):
        assert _parse_interval_to_ms("  60s  ") == 60000

    def test_case_insensitive(self):
        assert _parse_interval_to_ms("5S") == 5000

    def test_invalid_returns_default(self):
        assert _parse_interval_to_ms("abc") == 1000

    def test_invalid_ms_returns_default(self):
        assert _parse_interval_to_ms("abcms") == 1000


# ---------------------------------------------------------------------------
# _event_name_to_class
# ---------------------------------------------------------------------------

class TestEventNameToClass:
    def test_device_connected(self):
        assert _event_name_to_class("device_connected") == "DeviceEvent"

    def test_device_disconnected(self):
        assert _event_name_to_class("device_disconnected") == "DeviceEvent"

    def test_link_up(self):
        assert _event_name_to_class("link_up") == "LinkEvent"

    def test_link_down(self):
        assert _event_name_to_class("link_down") == "LinkEvent"

    def test_topology_change(self):
        assert _event_name_to_class("topology_change") == "TopologyEvent"

    def test_host_added(self):
        assert _event_name_to_class("host_added") == "HostEvent"

    def test_flow_added(self):
        assert _event_name_to_class("flow_added") == "FlowRuleEvent"

    def test_unknown_event(self):
        assert _event_name_to_class("custom_event") == "DeviceEvent"


# ---------------------------------------------------------------------------
# _app_name_to_package / _app_name_to_class
# ---------------------------------------------------------------------------

class TestAppNameConversion:
    def test_package_with_hyphen(self):
        assert _app_name_to_package("org.paranet.det-router") == "org.paranet.detrouter"

    def test_package_simple(self):
        assert _app_name_to_package("my-app") == "myapp"

    def test_package_dotted(self):
        assert _app_name_to_package("org.example.app") == "org.example.app"

    def test_class_from_dotted(self):
        assert _app_name_to_class("org.paranet.det-router") == "DetRouterAppComponent"

    def test_class_simple(self):
        assert _app_name_to_class("my-app") == "MyAppAppComponent"

    def test_class_no_special(self):
        assert _app_name_to_class("simpleapp") == "SimpleappAppComponent"


# ---------------------------------------------------------------------------
# collect_control
# ---------------------------------------------------------------------------

class TestCollectControl:
    def _make_control_block(self):
        """Build a ControlBlockNode matching the DSL example control block."""
        return ControlBlockNode(
            app=AppMetaNode(
                name="deterministic-controller",
                version="1.0.0",
                description="Deterministic fabric controller",
                onos_version="2.7",
                features=["topology_discovery", "path_computation"],
            ),
            capabilities=["forwarding", "monitoring"],
            states=[
                StateDeclNode(name="device_count", type_expr="int"),
                StateDeclNode(name="flow_count", type_expr="int"),
                StateDeclNode(name="is_converged", type_expr="bool"),
            ],
            event_handlers=[
                OnEventNode(
                    event_name="link_down",
                    params=["src", "dst"],
                    actions=["detect_failure(src, dst)", "trigger_reroute(src, dst)"],
                ),
                OnEventNode(
                    event_name="device_connected",
                    params=["device_id"],
                    actions=["authenticate_device(device_id)", "install_base_rules(device_id)"],
                ),
            ],
            periodic_tasks=[
                PeriodicNode(
                    name="health_check",
                    every="60s",
                    actions=["check_all_devices()", "report_status()"],
                ),
            ],
            flow_pushes=[
                FlowPushNode(
                    target="spine1",
                    rules_ref="from acl.deterministic_rules",
                    via="netconf.default",
                ),
            ],
        )

    def test_app_metadata(self):
        ctrl = self._make_control_block()
        ir = collect_control(ctrl)
        assert ir.app.name == "deterministic-controller"
        assert ir.app.version == "1.0.0"
        assert ir.app.description == "Deterministic fabric controller"
        assert ir.app.onos_version == "2.7"
        assert "topology_discovery" in ir.app.features

    def test_capabilities(self):
        ctrl = self._make_control_block()
        ir = collect_control(ctrl)
        assert ir.capabilities == ["forwarding", "monitoring"]

    def test_states_java_types(self):
        ctrl = self._make_control_block()
        ir = collect_control(ctrl)
        assert len(ir.states) == 3
        assert ir.states[0].name == "device_count"
        assert ir.states[0].java_type == "Integer"
        assert ir.states[1].name == "flow_count"
        assert ir.states[1].java_type == "Integer"
        assert ir.states[2].name == "is_converged"
        assert ir.states[2].java_type == "Boolean"

    def test_event_handlers(self):
        ctrl = self._make_control_block()
        ir = collect_control(ctrl)
        assert len(ir.event_handlers) == 2

        link_handler = ir.event_handlers[0]
        assert link_handler.event_name == "link_down"
        assert link_handler.event_class == "LinkEvent"
        assert link_handler.params == ["src", "dst"]
        assert "detect_failure(src, dst)" in link_handler.actions
        assert link_handler.method_name == "LinkDown"

        dev_handler = ir.event_handlers[1]
        assert dev_handler.event_name == "device_connected"
        assert dev_handler.event_class == "DeviceEvent"
        assert dev_handler.params == ["device_id"]
        assert dev_handler.method_name == "DeviceConnected"

    def test_periodic_tasks(self):
        ctrl = self._make_control_block()
        ir = collect_control(ctrl)
        assert len(ir.periodic_tasks) == 1
        task = ir.periodic_tasks[0]
        assert task.name == "health_check"
        assert task.every_ms == 60000
        assert task.method_name == "periodicHealthCheck"
        assert "check_all_devices()" in task.actions

    def test_flow_pushes(self):
        ctrl = self._make_control_block()
        ir = collect_control(ctrl)
        assert len(ir.flow_pushes) == 1
        fp = ir.flow_pushes[0]
        assert fp.target == "spine1"
        assert fp.rules_ref == "from acl.deterministic_rules"
        assert fp.via == "netconf.default"

    def test_empty_control_block(self):
        ctrl = ControlBlockNode()
        ir = collect_control(ctrl)
        assert ir.app.name == ""
        assert ir.capabilities == []
        assert ir.states == []
        assert ir.event_handlers == []
        assert ir.periodic_tasks == []
        assert ir.flow_pushes == []

    def test_with_discovery(self):
        ctrl = ControlBlockNode(
            discovery=DiscoveryNode(
                providers=[
                    ProviderEntryNode(name="lldp", config={"interval": "30s"}),
                ],
                on_connected=["authenticate_device(id)"],
                on_disconnected=["remove_device(id)"],
            ),
        )
        ir = collect_control(ctrl)
        assert ir.discovery is not None
        assert len(ir.discovery.providers) == 1
        assert ir.discovery.providers[0]["name"] == "lldp"
        assert ir.discovery.on_connected_actions == ["authenticate_device(id)"]
        assert ir.discovery.on_disconnected_actions == ["remove_device(id)"]


# ---------------------------------------------------------------------------
# emit_onos_app
# ---------------------------------------------------------------------------

class TestOnosEmitter:
    def _make_ir(self) -> ControlIR:
        """Build a ControlIR for emission testing."""
        ir = ControlIR()
        ir.app = OnosAppMeta(
            name="org.paranet.det-router",
            version="1.0.0",
            description="Deterministic routing app",
            onos_version="2.7",
            features=["topology_discovery", "path_computation"],
            package_name="org.paranet.detrouter",
        )
        ir.states = [
            OnosStateDecl(name="device_count", java_type="Integer", store_type="consistent"),
            OnosStateDecl(name="routing_table", java_type="Map<String, String>", store_type="consistent"),
        ]
        ir.event_handlers = [
            OnosEventHandler(
                event_name="link_down",
                event_class="LinkEvent",
                params=["src", "dst"],
                actions=["detect_failure(src, dst)", "trigger_reroute(src, dst)"],
                method_name="LinkDown",
            ),
        ]
        ir.periodic_tasks = [
            OnosPeriodicTask(
                name="health_check",
                every_ms=60000,
                actions=["check_all_devices()", "report_status()"],
                method_name="periodicHealthCheck",
            ),
        ]
        ir.flow_pushes = [
            OnosFlowPush(
                target="spine1",
                rules_ref="from acl.rules",
                via="netconf",
            ),
        ]
        return ir

    def test_generates_expected_files(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        assert "src/main/resources/app.xml" in files
        assert "pom.xml" in files
        # Main component class
        main_key = "src/main/java/org/paranet/detrouter/DetRouterAppComponent.java"
        assert main_key in files

    def test_event_listener_files(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        listener_key = "src/main/java/org/paranet/detrouter/LinkDownListener.java"
        assert listener_key in files

    def test_app_xml_content(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        xml = files["src/main/resources/app.xml"]
        assert 'name="org.paranet.det-router"' in xml
        assert 'version="1.0.0"' in xml
        assert "<description>Deterministic routing app</description>" in xml
        assert "<feature>topology_discovery</feature>" in xml

    def test_pom_xml_content(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        pom = files["pom.xml"]
        assert "<groupId>org.paranet.detrouter</groupId>" in pom
        assert "<artifactId>det-router</artifactId>" in pom
        assert "<version>2.7</version>" in pom  # ONOS version in dependency
        assert "<version>1.0.0</version>" in pom  # App version

    def test_component_has_activate_deactivate(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        main_key = "src/main/java/org/paranet/detrouter/DetRouterAppComponent.java"
        java = files[main_key]
        assert "@Activate" in java
        assert "@Deactivate" in java
        assert "DetRouterAppComponent" in java

    def test_component_has_state_fields(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        main_key = "src/main/java/org/paranet/detrouter/DetRouterAppComponent.java"
        java = files[main_key]
        assert "private volatile Integer device_count;" in java
        assert "private volatile Map<String, String> routing_table;" in java

    def test_component_has_periodic_task(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        main_key = "src/main/java/org/paranet/detrouter/DetRouterAppComponent.java"
        java = files[main_key]
        assert "private void periodicHealthCheck()" in java
        assert "60000" in java

    def test_component_has_event_handler(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        main_key = "src/main/java/org/paranet/detrouter/DetRouterAppComponent.java"
        java = files[main_key]
        assert "public void handleLinkDown(src, dst)" in java

    def test_component_has_flow_push(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        main_key = "src/main/java/org/paranet/detrouter/DetRouterAppComponent.java"
        java = files[main_key]
        assert "pushFlowRules" in java
        assert "spine1" in java

    def test_event_listener_content(self):
        ir = self._make_ir()
        files = emit_onos_app(ir)
        listener_key = "src/main/java/org/paranet/detrouter/LinkDownListener.java"
        java = files[listener_key]
        assert "DeviceListener" in java
        assert "LinkListener" in java
        assert "TopologyListener" in java
        assert "LinkDownListener" in java


# ---------------------------------------------------------------------------
# End-to-end: parse DSL → collect control IR → emit ONOS Java
# ---------------------------------------------------------------------------

class TestControlEndToEnd:
    def test_parse_and_generate(self):
        dsl = """
        polymorphic TestProtocol {
            control {
                app {
                    name: "test-app"
                    version: "2.0.0"
                    description: "Test application"
                }
                capabilities: ["forwarding"]
                state counter: int;
                on link_up(port) {
                    log_event(port);
                }
                periodic cleanup {
                    every: "30s"
                    remove_stale();
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(dsl)
        assert result.ast is not None, f"Parse failed: {[d.to_dict() for d in result.diagnostics]}"

        proto = result.ast.protocols[0]
        assert proto.control is not None

        ir = collect_control(proto.control)
        assert ir.app.name == "test-app"
        assert ir.app.version == "2.0.0"
        assert len(ir.states) == 1
        assert ir.states[0].java_type == "Integer"
        assert len(ir.event_handlers) == 1
        assert ir.event_handlers[0].event_class == "LinkEvent"
        assert len(ir.periodic_tasks) == 1
        assert ir.periodic_tasks[0].every_ms == 30000

        files = emit_onos_app(ir)
        assert "src/main/resources/app.xml" in files
        assert "pom.xml" in files
        assert 'name="test-app"' in files["src/main/resources/app.xml"]

    def test_example_file_control(self):
        """Test the deterministic example file's control block through the full pipeline."""
        from pathlib import Path
        example_path = Path(__file__).parent.parent / "dsl" / "examples" / "poly_deterministic.poly"
        parser = PolyParser()
        result = parser.parse_file(example_path)
        assert result.ast is not None, f"Parse failed: {[d.to_dict() for d in result.diagnostics]}"

        proto = result.ast.protocols[0]
        assert proto.control is not None

        ir = collect_control(proto.control)
        assert ir.app.name == "deterministic-controller"
        assert ir.app.version == "1.0.0"
        assert len(ir.capabilities) == 3
        assert "forwarding" in ir.capabilities
        assert len(ir.states) == 3
        assert len(ir.event_handlers) == 2
        assert len(ir.periodic_tasks) == 1
        assert ir.periodic_tasks[0].every_ms == 60000
        assert len(ir.flow_pushes) == 1

        files = emit_onos_app(ir)
        assert len(files) >= 3  # app.xml, pom.xml, main component, listeners

        # Verify Java files compile-ready basics
        java_files = [k for k in files if k.endswith(".java")]
        for jf in java_files:
            content = files[jf]
            assert "package " in content
            assert "class " in content

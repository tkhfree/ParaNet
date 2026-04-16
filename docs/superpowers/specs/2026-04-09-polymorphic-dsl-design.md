# Polymorphic Network Protocol DSL Design

**Date**: 2026-04-09
**Status**: Draft
**Author**: Collaborative design session

## 1. Overview

Design a new parallel DSL (alongside PNE) for **designing new network protocols** from scratch. Unlike PNE which configures networks using existing protocols, this DSL enables creation of entirely new protocol stacks covering topology, control plane, and data plane.

### 1.1 Design Goals

- **Stronger expressiveness**: Cover scenarios PNE cannot express
- **Declarative style**: High-level intent-based descriptions, not imperative programming
- **Broad paradigm support**: DetNet, compute-aware networking, zero-trust, multicast/content distribution
- **Three-plane coverage**: Topology, control plane, data plane in a unified protocol definition
- **Protocol inheritance and extension**: Compose and extend protocols

### 1.2 Target Scenarios


| Scenario                          | Topology             | Control Plane                       | Data Plane                   |
| --------------------------------- | -------------------- | ----------------------------------- | ---------------------------- |
| Deterministic Networking (DetNet) | Fixed, low dynamic   | Schedule calculation, time sync     | Time-aware forwarding        |
| Compute-Aware Networking          | Medium dynamic       | Compute-aware routing               | Request-response routing     |
| Zero-Trust Security               | Arbitrary            | Identity distribution, policy sync  | Per-packet verification      |
| Multicast/Content Distribution    | Dynamic subscription | Distribution tree, cache management | Content-addressed forwarding |


## 2. Compilation Pipeline

A single protocol definition file compiles through three dependent paths:

```
polymorphic XXX {
  topology { }  ---> generate deployment topology + links ---> render visually
       |
       v
  control { }   ---> compile to ONOS App ---> runtime control logic
       |
       v
  data { }      ---> partition across devices ---> generate per-device P4 code
}
```

- `control { }` depends on `topology { }` (device info, management channels)
- `data { }` depends on `topology { }` (device profiles, P4 targets) and `control { }` (runtime state references)
- Each device in topology is a programmable data plane with a specific P4 target

## 3. Syntax Design

### 3.1 Protocol Definition and Inheritance

```
polymorphic <Name> extends <Parent> [with <Mixin1>, <Mixin2>] {
  topology { ... }
  control { ... }
  data { ... }
}
```

- `polymorphic` keyword defines a new protocol
- `extends` for single inheritance
- `with` for mixin composition (multiple inheritance)
- Sub-protocols can override any block from parent protocols

Example:

```
polymorphic DeterministicRouter extends BaseRouter {
  // ...
}

polymorphic ZeroTrustDetNet extends DeterministicRouter with ZeroTrust {
  // Multi-inheritance composition
}
```

### 3.2 Topology Block

The topology block describes network deployment, device profiles, and management channels. Supports both abstract patterns and concrete instances.

```
topology {
  // Device profile: defines P4 target info
  profile <ProfileName> {
    target: "<p4_target>"          // e.g., "bmv2", "tofino"
    pipeline: "<pipeline_arch>"    // e.g., "v1model", "tna"
    compiler: "<p4c_backend>"      // e.g., "p4c-bmv2", "bf-p4c"
    mgmt {
      protocol: "<mgmt_protocol>"  // e.g., "grpc", "gnmi", "netconf"
      port: <port_number>
      auth: "<auth_method>"        // e.g., "tls", "none"
    }
  }

  // Abstract topology pattern (parameterized)
  pattern <PatternName>(<params>) {
    layer <name>(<count>) { profile: <ProfileName> }
    mesh(<layer1>, <layer2>)
    // ... topology primitives
  }

  // Concrete nodes
  node <name> {
    role: <role_name>
    profile: <ProfileName>
    mgmt {
      address: "<ip_address>"
      protocol: "<mgmt_protocol>"
      port: <port_number>
    }
  }

  // Links with constraints
  link <src> -> <dst> { <constraints> }

  // Global constraints
  constrain <scope>: <constraint_expression>
}
```

Example:

```
topology {
  profile SwitchProfile {
    target: "bmv2"
    pipeline: "v1model"
    compiler: "p4c-bmv2"
    mgmt {
      protocol: "grpc"
      port: 50051
      auth: "tls"
    }
  }

  profile TofinoSwitch {
    target: "tofino"
    pipeline: "tna"
    compiler: "bf-p4c"
    mgmt {
      protocol: "gnmi"
      port: 9339
      auth: "tls"
    }
  }

  pattern spine_leaf(spines: 2, leaves: 4) {
    layer spine(spines) { profile: SwitchProfile }
    layer leaf(leaves) { profile: SwitchProfile }
    mesh(spine, leaf)
  }

  node h1 {
    role: endpoint
    profile: TofinoSwitch
    mgmt {
      address: "10.0.0.1"
      protocol: "grpc"
      port: 50052
    }
  }
  node h2 {
    role: endpoint
    profile: TofinoSwitch
    mgmt {
      address: "10.0.0.2"
      protocol: "grpc"
      port: 50052
    }
  }

  link h1 -> leaf-1 { dedicated: true, latency: "< 1ms" }
  link h2 -> leaf-2 { dedicated: true, latency: "< 1ms" }

  constrain all_links: bandwidth >= "1Gbps"
}
```

**Compilation target**: Generate concrete topology deployment (nodes, links, addresses) and render visually via ParaNet's D3.js topology engine.

### 3.3 Control Block

The control block compiles to an **ONOS Application** loaded into ONOS SDN controller.

```
control {
  // ONOS app metadata
  app {
    name: "<onos_app_name>"
    version: "<version>"
    description: "<desc>"
    onos_version: "<version_constraint>"
    features: [<feature_list>]
  }

  // Control capabilities
  capabilities: [<capability_list>]

  // Runtime state -> ONOS Distributed Store
  state <name>: <type>

  // Device discovery -> ONOS DeviceProvider
  discovery {
    providers: {
      <provider_name>: { <config> }
    }
    on DeviceConnected(device) { <actions> }
    on DeviceDisconnected(device) { <actions> }
  }

  // Event-driven rules -> ONOS EventListener
  on <Event>(<params>) { <actions> }

  // Periodic tasks -> ONOS ScheduledExecutorService
  periodic <name> {
    every: "<interval>"
    <actions>
  }

  // Flow rule push -> ONOS FlowRuleService
  flow_push {
    target: <device>
    rules: from data.<module_name>
    via: device.mgmt
  }
}
```

**ONOS concept mapping**:


| DSL Construct              | ONOS Concept                                        |
| -------------------------- | --------------------------------------------------- |
| `app { }`                  | ONOS Application descriptor (app.xml, AppComponent) |
| `state`                    | ONOS Distributed Store                              |
| `discovery`                | ONOS DeviceProvider                                 |
| `on Event { }`             | ONOS EventListener                                  |
| `periodic`                 | ONOS ScheduledExecutorService                       |
| `flow_push`                | ONOS FlowRuleService                                |
| `topology.mgmt` references | Provider connection config                          |


Example:

```
control {
  app {
    name: "org.paranet.deterministic-router"
    version: "1.0.0"
    description: "Deterministic routing control app"
    onos_version: ">= 2.7"
    features: [openflow, netconf, gnmic]
  }

  capabilities: [route_discovery, schedule_calculation, fault_recovery]

  state routing_table: map<addr, next_hop>
  state flow_schedule: map<flow_id, time_slot>
  state neighbor_db: set<node_id>

  discovery {
    providers: {
      openflow: { port: 6653 }
      gnmic: { use: topology.mgmt }
    }
    on DeviceConnected(device) {
      provision(device, from: routing_table)
      push flow_schedule(to: device, via: device.mgmt)
    }
    on DeviceDisconnected(device) {
      mark_offline(device)
      trigger: LinkFailure(links_of(device))
    }
  }

  on TopologyChange(event) {
    recalculate routing_table(event.affected_area)
    push routing_table(to: affected_devices, via: mgmt)
    push flow_schedule(to: affected_devices, via: mgmt)
  }

  on LinkFailure(link) {
    remove routing_table(affected_entries)
    recalculate flow_schedule()
    push routing_table(to: affected_nodes, via: mgmt)
  }

  periodic refresh_schedule {
    every: "100ms"
    collect telemetry(from: all_devices)
    recalculate flow_schedule()
    push flow_schedule(to: all_devices, via: mgmt)
  }

  flow_push {
    target: device
    rules: from data.forward
    via: device.mgmt
  }
}
```

**Compilation target**: Generate ONOS Application source code (Java/OSGi bundle) including app.xml descriptor, event listeners, distributed stores, and flow rule service integration.

### 3.4 Data Block

The data block defines packet processing logic using reusable modules, which are partitioned across topology devices and compiled to P4 code.

```
data {
  // Packet format definition
  packet <PacketName> {
    header { <fields> }
    metadata { <fields> }
  }

  // Parser definition
  parse <PacketName> {
    extract <header>
    match <field> { <cases> }
  }

  // Module reuse
  include "<path>"

  // Forwarding module (replaces intent)
  module <name>(<PacketName>) {
    when: <match_condition>
    action: <action_description>
    constraints: { <constraints> }
  }

  // Service placement (replaces placement)
  service <name> {
    applies: [<module_list>]
    target_role: <role>
    pipeline: <pipeline_type>
    constrain: <device_constraints>
  }
}
```

**Compilation target**: Generate per-device P4 code, using device profile info from topology to select P4 target and pipeline architecture. Modules are partitioned across devices according to service placement rules.

Example:

```
data {
  packet DetPacket {
    header {
      eth: ethernet
      ipv4: ipv4
      det: custom {
        flow_id: uint(16)
        slot_id: uint(8)
        seq_num: uint(32)
        timestamp: uint(64)
      }
    }
    metadata {
      ingress_port: uint(8)
      egress_port: uint(8)
    }
  }

  parse DetPacket {
    extract ethernet
    match eth.ethertype {
      0x0800 => extract ipv4
      _ => drop
    }
    extract det
  }

  include "modules/base_forward.pn"
  include "modules/multicast.pn"

  module forward(DetPacket) {
    when ipv4.dst_addr matches routing_table
    action forward(next_hop, with_timing: slot_id)
    constraints {
      guaranteed_delay: "< 50us"
      ordering: preserve
    }
  }

  module multicast_replication(DetPacket) {
    when det.flow_id in multicast_group
    action replicate(to: multicast_members)
  }

  module buffer_control(DetPacket) {
    when buffer_occupancy > threshold
    action shape(rate: from_schedule)
  }

  module drop_invalid(DetPacket) {
    when not within_scheduled_slot(det.slot_id)
    action drop
  }

  service switching {
    applies: [parse, forward, buffer_control, drop_invalid]
    target_role: switch
    pipeline: match_action
    constrain per_device: table_entries <= device.profile.table_capacity
  }

  service edge_delivery {
    applies: [parse, forward, multicast_replication]
    target_role: endpoint
    pipeline: match_action
  }
}
```

## 4. Cross-Block References

The three blocks reference each other through defined identifiers:


| Reference              | From          | To            | Example                              |
| ---------------------- | ------------- | ------------- | ------------------------------------ |
| Device profiles & mgmt | control, data | topology      | `device.mgmt`, `topology.mgmt`       |
| Runtime state          | data          | control       | `routing_table`, `flow_schedule`     |
| Module definitions     | service       | module        | `applies: [forward, buffer_control]` |
| Device roles           | service       | topology.node | `target_role: switch`                |


## 5. Complete Example: DeterministicRouter

```
polymorphic DeterministicRouter extends BaseRouter {

  topology {
    profile SwitchProfile {
      target: "bmv2"
      pipeline: "v1model"
      compiler: "p4c-bmv2"
      mgmt { protocol: "grpc", port: 50051, auth: "tls" }
    }

    profile TofinoSwitch {
      target: "tofino"
      pipeline: "tna"
      compiler: "bf-p4c"
      mgmt { protocol: "gnmi", port: 9339, auth: "tls" }
    }

    pattern spine_leaf(spines: 2, leaves: 4) {
      layer spine(spines) { profile: SwitchProfile }
      layer leaf(leaves) { profile: SwitchProfile }
      mesh(spine, leaf)
    }

    node h1 {
      role: endpoint
      profile: TofinoSwitch
      mgmt { address: "10.0.0.1", protocol: "grpc", port: 50052 }
    }
    node h2 {
      role: endpoint
      profile: TofinoSwitch
      mgmt { address: "10.0.0.2", protocol: "grpc", port: 50052 }
    }

    link h1 -> leaf-1 { dedicated: true, latency: "< 1ms" }
    link h2 -> leaf-2 { dedicated: true, latency: "< 1ms" }
    constrain all_links: bandwidth >= "1Gbps"
  }

  control {
    app {
      name: "org.paranet.deterministic-router"
      version: "1.0.0"
      description: "Deterministic routing control app"
      onos_version: ">= 2.7"
      features: [openflow, netconf, gnmic]
    }

    capabilities: [route_discovery, schedule_calculation, fault_recovery]

    state routing_table: map<addr, next_hop>
    state flow_schedule: map<flow_id, time_slot>
    state neighbor_db: set<node_id>

    discovery {
      providers: {
        openflow: { port: 6653 }
        gnmic: { use: topology.mgmt }
      }
      on DeviceConnected(device) {
        provision(device, from: routing_table)
        push flow_schedule(to: device, via: device.mgmt)
      }
      on DeviceDisconnected(device) {
        mark_offline(device)
        trigger: LinkFailure(links_of(device))
      }
    }

    on TopologyChange(event) {
      recalculate routing_table(event.affected_area)
      push routing_table(to: affected_devices, via: mgmt)
      push flow_schedule(to: affected_devices, via: mgmt)
    }

    on LinkFailure(link) {
      remove routing_table(affected_entries)
      recalculate flow_schedule()
      push routing_table(to: affected_nodes, via: mgmt)
    }

    periodic refresh_schedule {
      every: "100ms"
      collect telemetry(from: all_devices)
      recalculate flow_schedule()
      push flow_schedule(to: all_devices, via: mgmt)
    }

    flow_push {
      target: device
      rules: from data.forward
      via: device.mgmt
    }
  }

  data {
    packet DetPacket {
      header {
        eth: ethernet
        ipv4: ipv4
        det: custom {
          flow_id: uint(16)
          slot_id: uint(8)
          seq_num: uint(32)
          timestamp: uint(64)
        }
      }
      metadata {
        ingress_port: uint(8)
        egress_port: uint(8)
      }
    }

    parse DetPacket {
      extract ethernet
      match eth.ethertype {
        0x0800 => extract ipv4
        _ => drop
      }
      extract det
    }

    include "modules/base_forward.pn"
    include "modules/multicast.pn"

    module forward(DetPacket) {
      when ipv4.dst_addr matches routing_table
      action forward(next_hop, with_timing: slot_id)
      constraints {
        guaranteed_delay: "< 50us"
        ordering: preserve
      }
    }

    module multicast_replication(DetPacket) {
      when det.flow_id in multicast_group
      action replicate(to: multicast_members)
    }

    module buffer_control(DetPacket) {
      when buffer_occupancy > threshold
      action shape(rate: from_schedule)
    }

    module drop_invalid(DetPacket) {
      when not within_scheduled_slot(det.slot_id)
      action drop
    }

    service switching {
      applies: [parse, forward, buffer_control, drop_invalid]
      target_role: switch
      pipeline: match_action
      constrain per_device: table_entries <= device.profile.table_capacity
    }

    service edge_delivery {
      applies: [parse, forward, multicast_replication]
      target_role: endpoint
      pipeline: match_action
    }
  }
}
```

## 6. Design Decisions Summary


| Decision                 | Choice                                      | Rationale                                            |
| ------------------------ | ------------------------------------------- | ---------------------------------------------------- |
| Protocol keyword         | `polymorphic`                               | Reflects protocol design nature                      |
| Three-plane organization | Block-based (`topology`, `control`, `data`) | Clear separation, explicit dependencies              |
| Topology description     | Mixed abstract + concrete                   | Flexible, supports both templates and explicit nodes |
| Control plane target     | ONOS Application                            | Industry-standard SDN controller                     |
| Data plane abstraction   | High-level intent (module)                  | Declarative, compiler generates P4                   |
| Module placement         | `service` construct                         | Clear service-to-device mapping                      |
| Reuse mechanism          | `include` + `extends`/`with`                | File-level and protocol-level reuse                  |
| Management channels      | In topology (`mgmt` in profile and node)    | Control plane references for device communication    |



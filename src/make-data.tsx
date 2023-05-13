import React from "react";
import Fakerator from "fakerator";

export type ResourceStub = ReturnType<typeof makeData>[0];

export const enum ResourceColumnId {
  name = "name",
  namespace = "namespace",
  containers = "containers",
  restarts = "restarts",
  node = "node",
  qos = "qos",
  status = "status",
  age = "age",
}

export function makeData(len: number) {
  const pods = [];
  const fakerator = Fakerator();
  const namespaces = [
    "kube-system",
    "ldk-webhooks",
    "lens-metrics",
    "default",
    "nginx",
    "acme-org"
  ]
  const nodes = [
    "master",
    "worker"
  ]
  const QoS = [
    "Burstable",
    "BestEffort"
  ]
  const Statuses = [
    "Running",
    "Failed",
    "Completed",
    "Pending"
  ]

  for (let i = 0; i < len; i++) {
    const name = fakerator.names.name();
    const namespace = namespaces[getRandomIndex(namespaces.length)]
    const node = nodes[getRandomIndex(nodes.length)]
    const qos = QoS[getRandomIndex(QoS.length)]
    const status = Statuses[getRandomIndex(Statuses.length)];
    const restarts = Math.ceil(Math.random() * 9);
    const containers = Math.ceil(Math.random() * 5);
    const resourceId = `id-${Number(Math.random() * 1e8 + 1e8).toString(32)}`;
    const resourceAge = new Date().getTime();

    pods.push({
      apiVersion: "v1",
      metadata: {
        name,
        namespace
      },
      getId: () => resourceId,
      getName: () => name,
      getNs: () => namespace,
      getContainerNumber: () => containers,
      getRestarts: () => restarts,
      getNode: () => node,
      getQoS: () => qos,
      getStatus: () => status,
      getAge: () => resourceAge,
    })
  }

  return pods;
}

export function getRandomIndex(arrayLength: number): number {
  return Math.floor(Math.random() * arrayLength);
}

export function renderContainers(num: number): React.ReactNode {
  const containers: React.ReactNode[] = [];

  for (let i = 0; i < num; i++) {
    containers.push(
      <div key={`container-${i}`} style={{
        width: "8px",
        height: "8px",
        backgroundColor: "rgb(28 199 77)"
      }}></div>
    )
  }

  return (
    <div style={{ display: "flex", "gap": "0.3rem", flexWrap: "wrap" }}>
      {containers}
    </div>
  )
}

export function renderStatus(status: string): React.ReactNode {
  let color = "inherit";

  switch (status) {
  case "Running":
    color = "rgb(28 199 77)";
    break;
  case "Pending":
    color = "orange"
    break
  case "Failed":
    color = "crimson"
    break
  }

  return (
    <span style={{ color }}>{status}</span>
  )
}

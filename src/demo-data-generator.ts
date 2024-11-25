import Fakerator from "fakerator";
import type { ResourceWithId } from "./table";

export type ResourceStub = ReturnType<typeof generateDemoData>[0] & ResourceWithId;

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

export function generateDemoData(itemsCount: number) {
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

  for (let i = 0; i < itemsCount; i++) {
    const name = fakerator.names.name();
    const namespace = namespaces[getRandomIndex(namespaces.length)]
    const node = nodes[getRandomIndex(nodes.length)]
    const qos = QoS[getRandomIndex(QoS.length)]
    const status = Statuses[getRandomIndex(Statuses.length)];
    const restarts = Math.ceil(Math.random() * 9);
    const containers = Math.ceil(Math.random() * 5);
    const resourceId = crypto.randomUUID();
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

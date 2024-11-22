import React from "react";

export function Containers({ num }: { num: number }) {
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

export function Status({ status }: { status: string }) {
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

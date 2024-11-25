import React from "react";
import { createRoot } from "react-dom/client";
import { persistTableState } from "./table";
import { DemoTable } from "./demo-table";
import { demoTableState } from "./demo-table-state";

// TODO: deploy demo to vercel
const appRootElem = document.getElementById('app');

// Import and export data changes to local-storage
await persistTableState({
  tableState: demoTableState,

  async toStorage(tableId, state) {
    console.log(`[SAVING STATE]: id=${tableId}`, state);
    sessionStorage.setItem(tableId, JSON.stringify(state));
  },

  async fromStorage(tableId: string) {
    console.log(`[LOADING STATE]: id=${tableId}`);
    return JSON.parse(sessionStorage.getItem(tableId) ?? `{}`);
  }
});

// Render grid
createRoot(appRootElem).render(
  <DemoTable store={demoTableState}/>
);

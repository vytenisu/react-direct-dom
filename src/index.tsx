import { App, App2 } from "./App";

import * as React from "./react-direct-dom";
// import React from "react";
// import * as ReactDOM from "react-dom/client";
// (React as any).createRoot = ReactDOM.createRoot;

// import React from "react";

const root = (React as any).createRoot(
  document.getElementById("root") as HTMLElement
);

const performTest = async () => {
  console.log("STARTING TEST");
  console.profile("Render");

  const startTime = new Date().getTime();

  for (let i = 0; i < 50; i++) {
    await root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // console.log("------");
    await root.render(<App2 />);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const endTime = new Date().getTime();

  console.profileEnd();
  console.log("DURATION: " + (endTime - startTime).toString());
};

performTest();
// setTimeout(performTest, 5000);

// document.getElementById("first")?.setAttribute("data-hello", "world");

// root.render(<App2 />);

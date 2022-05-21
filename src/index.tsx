import * as React from "./react-direct-dom";
import { App, App2 } from "./App";

// import React from "react";

document.getElementById("root")?.click();

const root = React.createRoot(document.getElementById("root") as HTMLElement);

// root.render(<App />);

// document.getElementById("first")?.setAttribute("data-hello", "world");
console.log("-----------------------");

root.render(<App2 />);

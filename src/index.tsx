import * as React from "./react-direct-dom";
import { App } from "./App";

const root = React.createRoot(document.getElementById("root") as HTMLElement);

root.render(<App />);

import * as React from "./react-direct-dom";
// import React from "react";

export const App = () => (
  <div id="wrapper">
    <>
      <div id="first">Pirmas</div>
      <div id="second">Antras</div>
    </>
    <>
      <div id="third">Pirmas</div>
      <div id="fourth">Antras</div>
    </>
  </div>
);

export const App2 = () => (
  <div id="wrapper">
    <>
      <div id="second">Antras</div>
      <div id="first">Pirmas</div>
    </>
    <>
      <div id="third">Pirmas</div>
      <div id="fourth">Antras</div>
    </>
  </div>
);

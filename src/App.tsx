import * as React from "./react-direct-dom";

// export const App = () => <div id="wrapper">Hello</div>;

export const App = () => (
  <>
    <div key="test">A</div>
    <div>B</div>
  </>
);

export const App2 = () => (
  <>
    <div>B</div>
    <div>A</div>
  </>
);

// export const App = () => (
//   <div id="wrapper">
//     <>
//       <div key="belekas" id="first" className="labas">
//         Pirmas
//       </div>
//       <div id="second">Antras</div>
//     </>
//     <>
//       <div id="third" className="labas">
//         Pirmas
//       </div>
//       <div id="fourth">Antras</div>
//     </>
//   </div>
// );

// export const App2 = () => (
//   <div id="wrapper">
//     <>
//       <div id="second">Antras</div>
//       <div id="first" className="labas">
//         Pirmas
//       </div>
//     </>
//     <>
//       <div id="third" className="labas">
//         Pirmas
//       </div>
//       <div id="fourth">Antras</div>
//     </>
//   </div>
// );

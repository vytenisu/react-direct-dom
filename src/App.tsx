import * as React from "./react-direct-dom";

// export const App = () => <div id="wrapper">Hello</div>;

export const App = () => (
  <div>
    <>
      <div>A</div>
    </>
    <>
      <div>B</div>
    </>
    <>
      <>
        <>
          <>Labas</>
        </>
      </>
    </>
  </div>
);

export const App2 = () => (
  <div>
    <>
      <>
        <>
          <>Labas</>
        </>
      </>
    </>
    <div>C</div>
  </div>
);

// export const App = () => (
//   <div id="wrapper">
//     <>
//       <div id="first" className="labas">
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
//       <div id="first">Pirmas</div>
//     </>
//     <>
//       <div id="third">Pirmas</div>
//       <div id="fourth">Antras</div>
//     </>
//   </div>
// );

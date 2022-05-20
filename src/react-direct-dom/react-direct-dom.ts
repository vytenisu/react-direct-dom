const KEY_SEPARATOR = "`";
const SEPARATOR_COUNT_REGEXP = new RegExp(KEY_SEPARATOR, "g");

export const Fragment: RDDComponent = ({ children }) => children;

export const createRoot = (container: Element) => ({
  render: (children: any) => {
    // render: (children: RDDChild | RDDChild[]) => {
    createElement(Fragment, {}, children).render(container, null, "root");
  },
  // TODO: implement unmounting
});

const generateKey = (index: number, namespace: string = "") =>
  `${namespace}${KEY_SEPARATOR}${index}`;

const DOM_DATA_KEY = "_reactDirectDom";

export interface RDDProps {
  [key: string]: any;
}

export interface RDDElementData {
  props: { [key: string]: any };
  key: string;
}

const getElementData = (element: Element | ChildNode): RDDElementData =>
  (element as any)[DOM_DATA_KEY];

const setElementData = (element: Element | ChildNode, data: RDDElementData) => {
  (element as any)[DOM_DATA_KEY] = data;
};

const propMap: { [key: string]: string } = {
  className: "class",
};

const reversePropMap = Object.fromEntries(
  Object.entries(propMap).map(([key, value]) => [value, key])
);

const domKeyToComponentKey = (key: string) => {
  if (reversePropMap[key]) {
    return reversePropMap[key];
  }

  return key;
};

const componentKeyToDomKey = (key: string) => {
  const ignoredKeys = ["key"];

  if (ignoredKeys.includes(key) || key.startsWith("_")) {
    return null;
  }

  if (propMap[key]) {
    return propMap[key];
  }

  return key;
};

const updateChangedElementProps = (element: Element, props: RDDProps) => {
  const { props: oldProps } = getElementData(element);

  for (const key in oldProps) {
    const mappedKey = domKeyToComponentKey(key);

    if (Object.is(props[mappedKey], undefined) || props[mappedKey] === null) {
      element.removeAttribute(key);
    }
  }

  for (const key in props) {
    const mappedKey = componentKeyToDomKey(key);

    if (mappedKey !== null) {
      const currentValue = element.getAttribute(mappedKey);

      if (currentValue !== props[key]) {
        element.setAttribute(mappedKey, props[key]);
      }
    }
  }
};

export interface RDDElementRenderInfo {
  key: string | null;
  render: (
    parentElement: Element,
    element: Element | null,
    key: string
  ) => void;
}

export type RDDComponent = (props: RDDProps) => RDDChild | RDDChild[];

export type RDDAnyComponent = RDDComponent | string;

export type RDDChild = RDDElementRenderInfo | string;

// TODO: add hooks

let debugIndex = 1;

const runChildren = (
  element: Element,
  children: RDDChild[],
  childNodes?: ChildNode[],
  namespace: string = ""
) => {
  const debug = debugIndex++;

  console.log("START: ", debug);
  console.log({ namespace });

  if (!childNodes) {
    childNodes = Array.from(element.childNodes);
  }

  if (!children.length) {
    children = [];
  }

  const namespaceSeparatorCount = (
    namespace.match(SEPARATOR_COUNT_REGEXP) || []
  ).length;

  childNodes = childNodes.filter((childNode) => {
    const { key } = getElementData(childNode);
    const sameDepth =
      (key.match(SEPARATOR_COUNT_REGEXP) || []).length - 1 ===
      namespaceSeparatorCount;
    return key.startsWith(namespace) && sameDepth;
  });

  const childNodeMap: { [key: string]: ChildNode } = {};

  childNodes.forEach((childNode) => {
    const { key } = getElementData(childNode);
    childNodeMap[key] = childNode;
  });

  const childNodeKeys = Object.keys(childNodeMap);

  // FIXME: remove elements which are no longer passed

  const foundNodes: ChildNode[] = [];

  for (let index = 0; index < (children as RDDChild[]).length; index++) {
    const child = (children as RDDChild[])[index];

    const key =
      typeof child === "string" || !child.key
        ? generateKey(index, namespace)
        : child.key;

    console.log("LOOKING FOR KEY: ", key, " AMONG ", childNodeKeys);

    if (childNodeKeys[index] === key) {
      console.log("FOUND IN GOOD PLACE");
      foundNodes.push(childNodeMap[key]);

      if (typeof child === "string") {
        if (childNodeMap[key].textContent !== child) {
          childNodeMap[key].textContent = child;
        }
      } else {
        child.render(element, childNodeMap[key] as Element, key);
      }
    } else if (childNodeMap[key]) {
      console.log("FOUND IN BAD PLACE");
      foundNodes.push(childNodeMap[key]);

      element.insertBefore(
        childNodeMap[key],
        childNodeMap[childNodeKeys[index]]
      );

      childNodeKeys.splice(index, 0, key);

      if (typeof child === "string") {
        if (childNodeMap[key].textContent !== child) {
          childNodeMap[key].textContent = child;
        }
      } else {
        child.render(element, childNodeMap[key] as Element, key);
      }
    } else {
      console.log("DID NOT FIND");
      if (typeof child === "string") {
        const text = document.createTextNode(child);
        element.appendChild(text);
        setElementData(text, { key, props: {} });
      } else {
        child.render(element, null, key);
      }
    }
  }

  console.log("FOUND NODES: ", foundNodes.length);
  console.log("CHILD NODES: ", childNodes.length);

  for (const childNode of childNodes) {
    if (!foundNodes.includes(childNode)) {
      childNode.remove();
    }
  }

  console.log("END: ", debug);
};

export const createElement = (
  component: RDDAnyComponent,
  props: RDDProps,
  ...children: RDDChild[]
): RDDElementRenderInfo => {
  // FIXME: use some rare symbol but prevent it anywhere in string because it is used as namespace separator
  if (props?.key && props?.key?.toString().startsWith("_")) {
    throw new Error('RDD Element key may not start with "_"');
  }

  return {
    key: props?.key ? KEY_SEPARATOR + "_" + props.key : null,
    render: (parentElement: Element, element: Element | null, key: string) => {
      console.log({
        component,
        props,
        children,
        parentElement,
        element,
        key,
      });

      if (typeof component === "function") {
        const content = component({ ...props, children });

        if (typeof content === "string") {
          console.log("FUNCTION (string)");
          runChildren(parentElement, [content], undefined, key);
        } else if ((content as RDDChild[]).length) {
          console.log("FUNCTION (array)");
          runChildren(parentElement, content as RDDChild[], undefined, key);
        } else {
          console.log("FUNCTION (other)");
          runChildren(
            parentElement,
            [content as RDDElementRenderInfo],
            undefined,
            key
          );
          // (content as RDDElementRenderInfo).render(parentElement, element, key);
        }
      } else if (typeof component === "string") {
        let childNodes: ChildNode[] = [];

        if (element) {
          updateChangedElementProps(element, props);
          childNodes = Array.from(element.childNodes);
        } else {
          element = document.createElement(component);

          for (const key in props) {
            const mappedKey = componentKeyToDomKey(key);

            if (
              mappedKey &&
              !Object.is(props[key], undefined) &&
              props[key] !== null
            ) {
              element.setAttribute(mappedKey, props[key]);
            }
          }

          setElementData(element, { props, key });
          parentElement.appendChild(element);
        }

        console.log("EXECUTING CHILDREN");
        runChildren(element, children, childNodes);
      }
    },
  };
};

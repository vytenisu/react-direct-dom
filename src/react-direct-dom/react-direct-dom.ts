export const Fragment: RDDComponent = ({ children }) => children;

export const createRoot = (container: Element) => ({
  render: (children: any) => {
    // render: (children: RDDChild | RDDChild[]) => {
    createElement(Fragment, {}, children).render(container, null, "root");
  },
  // TODO: implement unmounting
});

const generateKey = (index: number, namespace: string = "") =>
  `rdd:${namespace ? `${namespace}-` : ""}${index}`;

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

const runChildren = (
  element: Element,
  children: RDDChild[],
  childNodes?: ChildNode[],
  namespace?: string
) => {
  if (!childNodes) {
    childNodes = Array.from(element.childNodes);
  }

  if (!children.length) {
    children = [];
  }

  const childNodeMap: { [key: string]: ChildNode } = {};

  childNodes.forEach((childNode) => {
    const { key } = getElementData(childNode);
    childNodeMap[key] = childNode;
  });

  const childNodeKeys = Object.keys(childNodeMap);

  // FIXME: remove elements which are no longer passed

  for (let index = 0; index < (children as RDDChild[]).length; index++) {
    const child = (children as RDDChild[])[index];

    const key =
      typeof child === "string" || !child.key
        ? generateKey(index, namespace)
        : child.key;

    if (childNodeKeys[index] === key) {
      if (typeof child === "string") {
        if (childNodeMap[key].textContent !== child) {
          childNodeMap[key].textContent = child;
        }
      } else {
        child.render(element, childNodeMap[key] as Element, key);
      }
    } else if (childNodeMap[key]) {
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
      if (typeof child === "string") {
        const text = document.createTextNode(child);
        element.appendChild(text);
        setElementData(text, { key, props: {} });
      } else {
        child.render(element, null, key);
      }
    }
  }
};

export const createElement = (
  component: RDDAnyComponent,
  props: RDDProps,
  ...children: RDDChild[]
): RDDElementRenderInfo => ({
  key: props.key ?? null,
  render: (parentElement: Element, element: Element | null, key: string) => {
    if (typeof component === "function") {
      const content = component({ ...props, children });

      if (typeof content === "string") {
        runChildren(parentElement, [content], undefined, key);
      } else if ((content as RDDChild[]).length) {
        runChildren(parentElement, content as RDDChild[], undefined, key);
      } else {
        (content as RDDElementRenderInfo).render(parentElement, element, key);
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

      runChildren(element, children, childNodes);
    }
  },
});

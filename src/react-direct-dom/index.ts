const KEY_SEPARATOR = "`";
const SEPARATOR_COUNT_REGEXP = new RegExp(KEY_SEPARATOR, "g");

let nextPropsCache: {
  [key: string]: {
    props: RDDProps;
    component: any;
  };
} = {};

let propsCache: {
  [key: string]: {
    props: RDDProps;
    component: any;
  };
} = {};

export const Fragment: RDDComponent = ({ children }) => children;

// Not resource hungry
const hash = (data: string) => {
  var hash = 0,
    i,
    chr;

  if (data.length === 0) return "";

  for (i = 0; i < data.length; i++) {
    chr = data.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return hash.toString(); //.substring(1, 5);
};

export const createRoot = (container: Element) => ({
  render: (children: any) => {
    return new Promise((resolve) => {
      // render: (children: RDDChild | RDDChild[]) => {
      createElement(Fragment, {}, children).render(
        container,
        null,
        "root",
        undefined,
        true
      );

      propsCache = nextPropsCache;
      nextPropsCache = {};

      // FIXME: resource hungry
      requestAnimationFrame(resolve);
    });
  },
  // TODO: implement unmounting
});

const generateKey = (
  index: number | string,
  namespace: string = "",
  hash: string = ""
) => `${namespace}${KEY_SEPARATOR}${index}#${hash}`;

const DATA_KEY = "_reactDirectDom";

export interface RDDProps {
  [key: string]: any;
}

export interface RDDElementData {
  key: string;
}

const getElementData = (element: Element | ChildNode): RDDElementData =>
  (element as any)[DATA_KEY];

const setElementData = (element: Element | ChildNode, data: RDDElementData) => {
  (element as any)[DATA_KEY] = data;
  // (element as Element).setAttribute?.("data-key", data.key); // TODO: DEBUG-ONLY CODE
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

  if (key.startsWith("_")) {
    return null;
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

const propsChanged = (oldProps: RDDProps, props: RDDProps) => {
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(props);

  if (oldKeys.length !== newKeys.length) {
    return true;
  }

  for (const key of oldKeys) {
    if (!key.startsWith("_") && oldProps[key] !== props[key]) {
      return true;
    }
  }

  return false;
};

// FIXME: Resource hungry
const updateChangedElementProps = (element: Element, props: RDDProps) => {
  const keys = element.getAttributeNames?.() ?? [];

  const oldProps: RDDProps = {};

  for (const key of keys) {
    oldProps[key] = element.getAttribute(key);
  }

  for (const key in oldProps) {
    const mappedKey = domKeyToComponentKey(key);

    if (
      mappedKey !== null &&
      (Object.is(props[mappedKey], undefined) || props[mappedKey] === null)
    ) {
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
  hash: string;
  key: string | null;
  isComponent: boolean;
  render: (
    parentElement: Element,
    element: Element | null,
    key: string,
    insertBefore?: ChildNode,
    forceRender?: boolean
  ) => void;
}

export type RDDComponent = (props: RDDProps) => RDDChild | RDDChild[];

export type RDDAnyComponent = RDDComponent | string;

export type RDDChild = RDDElementRenderInfo | string;

const runChildren = (
  element: Element,
  children: RDDChild[],
  allChildNodes?: ChildNode[],
  namespace: string = ""
) => {
  if (namespace.length && !namespace.startsWith(KEY_SEPARATOR)) {
    namespace = KEY_SEPARATOR + namespace;
  }

  if (!allChildNodes) {
    allChildNodes = Array.from(element.childNodes);
  }

  if (!children.length) {
    children = [];
  }

  const namespaceSeparatorCount = (
    namespace.match(SEPARATOR_COUNT_REGEXP) || []
  ).length;

  const deeperChildNodes: ChildNode[] = [];
  const directChildNodes: ChildNode[] = [];

  allChildNodes.forEach((childNode) => {
    const { key } = getElementData(childNode);

    if (key.startsWith(namespace)) {
      const keySeparatorCount =
        (key.match(SEPARATOR_COUNT_REGEXP) || []).length - 1;

      if (keySeparatorCount > namespaceSeparatorCount) {
        deeperChildNodes.push(childNode);
      } else if (keySeparatorCount === namespaceSeparatorCount) {
        directChildNodes.push(childNode);
      }
    }
  });

  const childNodeMap: { [key: string]: ChildNode } = {};

  directChildNodes.forEach((childNode) => {
    const { key } = getElementData(childNode);
    childNodeMap[key] = childNode;
  });

  const directChildNodeKeys = Object.keys(childNodeMap);

  const foundNodes: ChildNode[] = [];
  const foundKeys: string[] = [];

  for (let index = 0; index < (children as RDDChild[]).length; index++) {
    const child = (children as RDDChild[])[index];
    const isComponent = (child as RDDElementRenderInfo)?.isComponent ?? false;

    const key =
      typeof child === "string" || !child.key
        ? generateKey(
            index,
            namespace,
            typeof child === "string" ? "" : child.hash
          )
        : generateKey(child.key, namespace);

    foundKeys.push(key);

    if (!directChildNodeKeys.includes(key) && !isComponent) {
      allChildNodes.forEach((childNode) => {
        const { key: childKey } = getElementData(childNode);

        if (childKey.startsWith(key)) {
          childNode.remove();
        }
      });
    }

    if (directChildNodeKeys[index] === key && !isComponent) {
      foundNodes.push(childNodeMap[key]);

      if (typeof child === "string") {
        if (childNodeMap[key].textContent !== child) {
          childNodeMap[key].textContent = child;
        }
      } else {
        child.render(element, childNodeMap[key] as Element, key);
      }
    } else if (childNodeMap[key] && !isComponent) {
      foundNodes.push(childNodeMap[key]);

      element.insertBefore(
        childNodeMap[key],
        childNodeMap[directChildNodeKeys[index]]
      );

      directChildNodeKeys.splice(index, 0, key);

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

        if (childNodeMap[directChildNodeKeys[index]]) {
          element.insertBefore(text, childNodeMap[directChildNodeKeys[index]]);
        } else {
          element.appendChild(text);
        }

        setElementData(text, { key });
      } else {
        child.render(
          element,
          null,
          key,
          childNodeMap[directChildNodeKeys[index]]
        );
      }
    }
  }

  deeperChildNodes.forEach((childNode) => {
    const { key: childKey } = getElementData(childNode);
    if (
      !foundKeys.find(
        (foundKey) =>
          childKey.length > foundKey.length && childKey.startsWith(foundKey)
      )
    ) {
      childNode.remove();
    }
  });

  for (const childNode of directChildNodes) {
    if (!foundNodes.includes(childNode)) {
      childNode.remove();
    }
  }
};

export const createElement = (
  component: RDDAnyComponent,
  props: RDDProps,
  ...children: RDDChild[]
): RDDElementRenderInfo => {
  if (props?.key && props?.key?.includes(KEY_SEPARATOR)) {
    throw new Error(
      `RDD Element key may not contain symbol "${KEY_SEPARATOR}"`
    );
  }

  const isComponent = typeof component === "function";

  return {
    hash: props?.key
      ? ""
      : hash(
          isComponent
            ? ""
            : component +
                Object.keys(props ?? {}).join(",") +
                "#" +
                props.__source.fileName +
                "#" +
                props.__source.lineNumber +
                "#" +
                props.__source.columnNumber
        ),
    key: props?.key ? "_" + props.key : null,
    isComponent,
    render: (
      parentElement: Element,
      element: Element | null,
      key: string,
      insertBefore?: ChildNode,
      forceRender = false
    ) => {
      if (propsCache[key] && !forceRender) {
        const { props: oldProps, component: oldComponent } = propsCache[key];

        if (
          component === oldComponent &&
          !propsChanged(oldProps, props || {})
        ) {
          return;
        }
      }

      nextPropsCache[key] = { props: props || {}, component };

      if (typeof component === "function") {
        const content = component({ ...props, children });

        if (typeof content === "string") {
          runChildren(parentElement, [content], undefined, key);
        } else if ((content as RDDChild[]).length) {
          runChildren(parentElement, content as RDDChild[], undefined, key);
        } else {
          runChildren(
            parentElement,
            [content as RDDElementRenderInfo],
            undefined,
            key
          );
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

          setElementData(element, { key });

          if (insertBefore) {
            parentElement.insertBefore(element, insertBefore);
          } else {
            parentElement.appendChild(element);
          }
        }

        runChildren(element, children, childNodes, key);
      }
    },
  };
};

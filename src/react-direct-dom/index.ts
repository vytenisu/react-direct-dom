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

// TODO: need better hashing to avoid one element pretending to be another one
const generateKey = (index: number | string, namespace: string = "") =>
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
  data.props = Object.fromEntries(
    Object.entries(data.props)
      .map(([key, value]) => [componentKeyToDomKey(key), value])
      .filter(([key]) => key)
  );

  (element as any)[DOM_DATA_KEY] = data;
  (element as Element).setAttribute?.("data-key", data.key); // DEBUG
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

const updateChangedElementProps = (element: Element, props: RDDProps) => {
  const { props: oldProps } = getElementData(element);

  console.log({ props, oldProps });

  for (const key in oldProps) {
    const mappedKey = domKeyToComponentKey(key);

    if (
      mappedKey !== null &&
      (Object.is(props[mappedKey], undefined) || props[mappedKey] === null)
    ) {
      console.log("Removing attribute: ", key);
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

  const data = getElementData(element);
  data.props = props;
  setElementData(element, data);
};

export interface RDDElementRenderInfo {
  key: string | null;
  isComponent: boolean;
  render: (
    parentElement: Element,
    element: Element | null,
    key: string,
    insertBefore?: ChildNode
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
  allChildNodes?: ChildNode[],
  namespace: string = ""
) => {
  if (namespace.length && !namespace.startsWith(KEY_SEPARATOR)) {
    namespace = KEY_SEPARATOR + namespace;
  }

  const debug = debugIndex++;

  console.log("START: ", debug);
  console.log({ namespace });

  if (!allChildNodes) {
    allChildNodes = Array.from(element.childNodes);
  }

  if (!children.length) {
    children = [];
  }

  const namespaceSeparatorCount = (
    namespace.match(SEPARATOR_COUNT_REGEXP) || []
  ).length;

  // TODO: test if this is used below
  const initialChildKeys = allChildNodes.map(
    (child) => getElementData(child).key
  );

  console.log("ALL CHILD NODES: ", initialChildKeys);

  // const namespaceChildNodes = allChildNodes.filter((childNode) => {
  //   const { key } = getElementData(childNode);
  //   return key.startsWith(namespace);
  // });

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
    //   const sameDepth =
    //     (key.match(SEPARATOR_COUNT_REGEXP) || []).length - 1 ===
    //     namespaceSeparatorCount;
  });

  // const directChildNodes = namespaceChildNodes.filter((childNode) => {
  //   const { key } = getElementData(childNode);
  //   const sameDepth =
  //     (key.match(SEPARATOR_COUNT_REGEXP) || []).length - 1 ===
  //     namespaceSeparatorCount;
  //   return sameDepth;
  // });

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
        ? generateKey(index, namespace)
        : generateKey(child.key, namespace);

    foundKeys.push(key);

    if (!directChildNodeKeys.includes(key) && !isComponent) {
      allChildNodes.forEach((childNode) => {
        const { key: childKey } = getElementData(childNode);

        if (childKey.startsWith(key)) {
          console.log(`EMPTY ${key} REPLACED WITH DOM. REMOVING: `, childKey);
          childNode.remove();
        }
      });
    }

    console.log("LOOKING FOR KEY: ", key, " AMONG ", directChildNodeKeys);

    if (directChildNodeKeys[index] === key && !isComponent) {
      console.log("FOUND IN GOOD PLACE");
      foundNodes.push(childNodeMap[key]);

      if (typeof child === "string") {
        if (childNodeMap[key].textContent !== child) {
          childNodeMap[key].textContent = child;
        }
      } else {
        child.render(element, childNodeMap[key] as Element, key);
      }
    } else if (childNodeMap[key] && !isComponent) {
      console.log("FOUND IN BAD PLACE");
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
      console.log("DID NOT FIND");
      if (typeof child === "string") {
        const text = document.createTextNode(child);

        if (childNodeMap[directChildNodeKeys[index]]) {
          element.insertBefore(text, childNodeMap[directChildNodeKeys[index]]);
        } else {
          element.appendChild(text);
        }

        setElementData(text, { key, props: {} });
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

  // TODO: if there are deeper keys within current namespace which do not have parent among foundKeys
  // Delete them

  deeperChildNodes.forEach((childNode) => {
    const { key: childKey } = getElementData(childNode);
    if (
      !foundKeys.find(
        (foundKey) =>
          childKey.length > foundKey.length && childKey.startsWith(foundKey)
      )
    ) {
      console.log(`REMOVING ${childKey} - NO PARENT AMONG: `, foundKeys);
      childNode.remove();
    }
  });

  console.log("FOUND NODES: ", foundNodes.length);
  console.log("DIRECT CHILD NODES: ", directChildNodes.length);

  for (const childNode of directChildNodes) {
    if (!foundNodes.includes(childNode)) {
      childNode.remove();
    }
  }

  console.log("END: ", debug);
};

// FIXME: need to somehow remove branches which are no longer there
// For example if ID jumps over a namespace, element which used to be there needs to be deleted

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

  return {
    key: props?.key ? "_" + props.key : null,
    isComponent: typeof component === "function",
    render: (
      parentElement: Element,
      element: Element | null,
      key: string,
      insertBefore?: ChildNode
    ) => {
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
        }
      } else if (typeof component === "string") {
        let childNodes: ChildNode[] = [];

        if (element) {
          console.log("UPDATING PROPS");
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

          if (insertBefore) {
            parentElement.insertBefore(element, insertBefore);
          } else {
            parentElement.appendChild(element);
          }
        }

        console.log("RUNNING CHILDREN");
        runChildren(element, children, childNodes, key);
      }
    },
  };
};

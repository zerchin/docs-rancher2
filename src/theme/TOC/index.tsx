/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import clsx from "clsx";
import useTOCHighlight from "@theme/hooks/useTOCHighlight";
import type { TOCProps } from "@theme/TOC";
import styles from "./styles.module.css";
import { TOCItem } from "@docusaurus/types";

const LINK_CLASS_NAME = "table-of-contents__link";
const ACTIVE_LINK_CLASS_NAME = "table-of-contents__link--active";
const TOP_OFFSET = 100;

/* eslint-disable jsx-a11y/control-has-associated-label */
function Headings({
  toc,
  isChild,
}: {
  toc: readonly TOCItem[];
  isChild?: boolean;
}) {
  if (!toc.length) {
    return null;
  }
  return (
    <ul
      className={
        isChild ? "" : "table-of-contents table-of-contents__left-border"
      }
    >
      {toc.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={LINK_CLASS_NAME}
            // Developer provided the HTML, so assume it's safe.
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: heading.value }}
          />
          <Headings isChild toc={heading.children} />
        </li>
      ))}
    </ul>
  );
}

function TOC({ toc }: TOCProps): JSX.Element {
  useTOCHighlight(LINK_CLASS_NAME, ACTIVE_LINK_CLASS_NAME, TOP_OFFSET);
  return (
    <div className={clsx(styles.tableOfContents, "thin-scrollbar")}>
      <Headings toc={toc} />
      <div>
        <br />
        <a
          href="https://www.huodongxing.com/event/9599250103000?qd=wendang"
          target="_blank"
        >
          <img
            src="/img/cloud-native-conference-right.png"
            className={"cloud-native-conference-right"}
          ></img>
        </a>
      </div>
    </div>
  );
}

export default TOC;

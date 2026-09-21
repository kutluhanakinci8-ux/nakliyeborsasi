import { type ReactNode } from "react";

export function PageHeader(props: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      {props.action ? <div className="page-header-action">{props.action}</div> : null}
    </div>
  );
}

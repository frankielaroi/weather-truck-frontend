import type { ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  /** Short help shown under the label. */
  hint?: string;
  /** Message for this field; announced to screen readers when it appears. */
  error?: string;
  children: (aria: { id: string; "aria-describedby": string | undefined; "aria-invalid": true | undefined }) => ReactNode;
};

/** A labelled form control with a hint and an error: `<Field id="load" label="Load">{(aria) => <input {...aria} />}</Field>`. */
export const Field = ({ id, label, hint, error, children }: Props): React.ReactElement => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs opacity-75">
          {hint}
        </p>
      ) : null}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
};

/** Shared look for text inputs, selects and the combobox input. */
export const inputClass =
  "w-full rounded-md border border-foreground/40 bg-background px-3 py-2 text-base text-foreground placeholder:text-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-[invalid=true]:border-red-700 dark:aria-[invalid=true]:border-red-400";

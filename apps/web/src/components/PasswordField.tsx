"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "./messaging/ChatUiIcons";

type PasswordFieldProps = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  name?: string;
  required?: boolean;
  minLength?: number;
  id?: string;
};

export function PasswordField({
  className = "input-light",
  value,
  onChange,
  autoComplete,
  name,
  required,
  minLength,
  id,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        className={className}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        className="password-field-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        aria-pressed={visible}
      >
        {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}

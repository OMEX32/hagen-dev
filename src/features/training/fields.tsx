"use client";
import { useId } from "react";
import { Field as BaseField, SelectField as BaseSelect } from "@/features/forms/managed-form";
export function Field(props: Parameters<typeof BaseField>[0]) { const id = useId(); return <BaseField {...props} id={id} />; }
export function SelectField(props: Parameters<typeof BaseSelect>[0]) { const id = useId(); return <BaseSelect {...props} id={id} />; }
export function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><textarea {...props} id={id} /></div>;
}

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 border border-indigo-400/30",
        outline:
          "border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-600 text-slate-200",
        secondary:
          "bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60",
        ghost:
          "hover:bg-slate-800/60 hover:text-white text-slate-400",
        destructive:
          "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30",
        link: "text-indigo-400 underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-2 px-3.5",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs",
        sm: "h-7.5 gap-1.5 rounded-lg px-2.5 text-xs",
        lg: "h-11 gap-2.5 px-5 text-base rounded-xl",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-lg",
        "icon-sm": "size-7.5 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

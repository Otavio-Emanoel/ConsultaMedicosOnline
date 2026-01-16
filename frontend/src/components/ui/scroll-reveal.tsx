"use client"

import { useScrollAnimation } from "@/hooks/useScrollAnimation"
import type { ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  animation?: "fade-up" | "fade-left" | "fade-right" | "scale-in" | "fade"
  delay?: number
  className?: string
}

export default function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  className = "",
}: ScrollRevealProps) {
  const { elementRef, isVisible } = useScrollAnimation()

  return (
    <div
      ref={elementRef as any}
      className={`scroll-${animation} ${isVisible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

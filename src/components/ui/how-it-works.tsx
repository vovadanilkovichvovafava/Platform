"use client"

import { HelpCircle } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import type { PageLegend } from "@/lib/admin-help-texts"

interface HowItWorksProps {
  legend: PageLegend
  className?: string
}

/**
 * Collapsible "Как это работает" legend block for admin pages.
 * - Collapsed by default
 * - Sections: title + description + optional detail bullets
 * - Uses existing Collapsible UI component
 */
export function HowItWorks({ legend, className }: HowItWorksProps) {
  return (
    <Collapsible className={className}>
      <div className="rounded-lg border border-blue-200 bg-blue-50/60">
        <CollapsibleTrigger className="gap-3 px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100/50 rounded-lg transition-colors">
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
            {legend.heading}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 space-y-4">
            {legend.sections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  {section.title}
                </h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {section.description}
                </p>
                {section.details && section.details.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {section.details.map((detail, i) => (
                      <li
                        key={i}
                        className="text-sm text-blue-600 flex items-start gap-1.5"
                      >
                        <span className="shrink-0 mt-1.5 h-1 w-1 rounded-full bg-blue-400" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

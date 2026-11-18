import { useId } from "react";

import {
  SUPPORTED_LOCALES,
  type SupportedLocaleCode,
  asSupportedLocale,
} from "@/lib/i18n/locales";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VisitorLanguageCard({
  defaultLanguage,
  onDefaultLanguageChange,
  hasAccess,
  disabled = false,
}: {
  defaultLanguage: SupportedLocaleCode;
  onDefaultLanguageChange: (value: SupportedLocaleCode) => void;
  hasAccess: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visitor language</CardTitle>
        <CardDescription>
          Choose the language for the room&apos;s access form and viewer controls.
          Document content is not translated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor={id}>Default language</Label>
        <Select
          value={defaultLanguage}
          disabled={disabled || !hasAccess}
          onValueChange={(value) => {
            const locale = asSupportedLocale(value);
            if (hasAccess && !disabled && locale)
              onDefaultLanguageChange(locale);
          }}
        >
          <SelectTrigger id={id} aria-describedby={`${id}-hint`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Supported languages</SelectLabel>
              {SUPPORTED_LOCALES.map((locale) => (
                <SelectItem key={locale.code} value={locale.code}>
                  {locale.nativeName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hasAccess
            ? "Visitors use this language throughout the room. Save branding to apply your selection."
            : "Changing visitor language requires a Data Rooms Plus plan or an active trial."}
        </p>
      </CardContent>
    </Card>
  );
}

import Head from "next/head";
import Link from "next/link";

import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  FileText,
  FolderOpen,
  Info,
  Layers,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { BRAND } from "@/lib/brand";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const navigation = [
  { id: "foundations", label: "Foundations" },
  { id: "actions", label: "Actions" },
  { id: "inputs", label: "Inputs" },
  { id: "overlays", label: "Overlays" },
  { id: "states", label: "States" },
];

function ReferenceSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 border-t border-border py-10 sm:py-14"
    >
      <div className="mb-7 flex items-start gap-4">
        <span
          className="pt-1 font-mono text-xs text-muted-foreground"
          aria-hidden="true"
        >
          {number}
        </span>
        <div>
          <h2
            id={`${id}-title`}
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ThemeControls() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Reference theme"
    >
      {[
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
      ].map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          id={`ds-theme-${value}`}
          size="sm"
          variant={mounted && theme === value ? "secondary" : "ghost"}
          aria-pressed={mounted && theme === value}
          disabled={!mounted}
          onClick={() => setTheme(value)}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </Button>
      ))}
      <span id="ds-current-theme" className="sr-only" role="status">
        Current appearance: {mounted ? resolvedTheme : "loading"}
      </span>
    </div>
  );
}

function Foundations() {
  const surfaces = [
    {
      label: "Canvas",
      token: "background / foreground",
      classes: "bg-background text-foreground",
    },
    {
      label: "Card",
      token: "card / card-foreground",
      classes: "bg-card text-card-foreground",
    },
    {
      label: "Primary",
      token: "primary / primary-foreground",
      classes: "bg-primary text-primary-foreground",
    },
    {
      label: "Muted",
      token: "muted / muted-foreground",
      classes: "bg-muted text-muted-foreground",
    },
    {
      label: "Secondary",
      token: "secondary / secondary-foreground",
      classes: "bg-secondary text-secondary-foreground",
    },
    {
      label: "Destructive",
      token: "destructive / destructive-foreground",
      classes: "bg-destructive text-destructive-foreground",
    },
  ];
  return (
    <ReferenceSection
      id="foundations"
      number="01"
      title="A quiet foundation"
      description="Semantic colors pair a surface with its text color. The same components follow the selected light or dark appearance, including popovers and overlays."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surfaces.map(({ label, token, classes }) => (
          <div
            key={label}
            className="overflow-hidden rounded-xl border border-border"
          >
            <div className={`flex min-h-24 items-end p-4 ${classes}`}>
              <span className="text-lg font-medium">{label}</span>
            </div>
            <p className="border-t border-border bg-card px-4 py-3 font-mono text-[11px] text-muted-foreground">
              {token}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Typography
          </p>
          <h3 className="text-3xl font-semibold tracking-tight">
            Clarity comes first.
          </h3>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Short headings, readable descriptions, and precise action labels
            give the important details room to breathe.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Status labels
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            These are component variants, not the status of a live workspace.
            Use words as well as color to communicate meaning.
          </p>
        </div>
      </div>
    </ReferenceSection>
  );
}

function Actions() {
  const [message, setMessage] = useState(
    "Activate an enabled example to see its local response.",
  );
  const [disabledActivations, setDisabledActivations] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const previewLoading = () => {
    setLoading(true);
    setMessage("Previewing the loading state. No request is being sent.");
    timer.current = setTimeout(() => {
      setLoading(false);
      setMessage("Loading preview complete. Nothing was saved.");
    }, 900);
  };

  return (
    <ReferenceSection
      id="actions"
      number="02"
      title="Actions with a clear hierarchy"
      description="Choose one primary action, then use quieter variants for supporting choices. Loading and disabled controls remain unavailable to pointer and keyboard activation."
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="text-base">Button variants</h3>
          </CardTitle>
          <CardDescription>
            These examples update a message on this page only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="flex flex-wrap gap-3">
            {[
              { variant: "default", label: "Primary action" },
              { variant: "secondary", label: "Secondary" },
              { variant: "outline", label: "Outline" },
              { variant: "ghost", label: "Ghost" },
              { variant: "destructive", label: "Destructive style" },
              { variant: "link", label: "Link style" },
            ].map(({ variant, label }) => (
              <Button
                key={variant}
                variant={
                  variant as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "ghost"
                    | "destructive"
                    | "link"
                }
                onClick={() =>
                  setMessage(`${label} example activated. Nothing was saved.`)
                }
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMessage("Small button example activated.")}
            >
              Small
            </Button>
            <Button
              variant="outline"
              onClick={() => setMessage("Default button example activated.")}
            >
              Default size
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setMessage("Large button example activated.")}
            >
              Large
            </Button>
            <Button id="ds-disabled-button" disabled>
              Disabled
            </Button>
            <Button id="ds-static-loading" loading>
              Loading example
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              id="ds-run-loading"
              loading={loading}
              onClick={previewLoading}
            >
              {loading ? "Previewing…" : "Try loading state"}
            </Button>
            <Button asChild variant="outline">
              <a href="#foundations">
                Anchor action{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild disabled variant="outline">
              <a
                id="ds-disabled-link"
                href="#disabled-target"
                onClick={() => setDisabledActivations((count) => count + 1)}
              >
                Disabled anchor
              </a>
            </Button>
            <Button asChild loading variant="outline">
              <a
                id="ds-loading-link"
                href="#disabled-target"
                onClick={() => setDisabledActivations((count) => count + 1)}
              >
                Loading anchor
              </a>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 border-t border-border pt-4">
          <p
            id="ds-action-message"
            role="status"
            className="text-sm text-muted-foreground"
          >
            {message}
          </p>
          <output
            id="ds-disabled-count"
            className="text-xs text-muted-foreground"
          >
            Disabled-link activations: {disabledActivations}
          </output>
        </CardFooter>
      </Card>
    </ReferenceSection>
  );
}

function Inputs() {
  const [purpose, setPurpose] = useState("fundraising");
  const [checked, setChecked] = useState(false);
  return (
    <ReferenceSection
      id="inputs"
      number="03"
      title="Forms that explain themselves"
      description="Keep labels visible, connect help and error text to the field, and show a useful correction. Every field here is a local example; there is no save or submit operation."
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="text-base">Field examples</h3>
          </CardTitle>
          <CardDescription>
            Try the inputs, keyboard selection, and checkbox states.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ds-room-name">Example room name</Label>
            <Input
              id="ds-room-name"
              defaultValue="Northstar example"
              aria-describedby="ds-room-help"
            />
            <p id="ds-room-help" className="text-xs text-muted-foreground">
              Use a name that identifies the purpose of the room.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-purpose">Example room purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger id="ds-purpose" aria-describedby="ds-purpose-help">
                <SelectValue placeholder="Choose a purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Example purposes</SelectLabel>
                  <SelectItem value="fundraising">Fundraising</SelectItem>
                  <SelectItem value="diligence">Due diligence</SelectItem>
                  <SelectItem value="client-review">Client review</SelectItem>
                  <SelectItem value="unavailable" disabled>
                    Unavailable option
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p id="ds-purpose-help" className="text-xs text-muted-foreground">
              Use arrow keys to explore the grouped choices.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-error-email">
              Email address · error example
            </Label>
            <Input
              id="ds-error-email"
              type="email"
              defaultValue="investor@"
              aria-invalid="true"
              aria-describedby="ds-email-error"
              className="border-destructive focus-visible:ring-destructive"
            />
            <p id="ds-email-error" className="text-xs text-destructive">
              Enter a complete address, such as name@example.com.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-disabled-field">Unavailable field</Label>
            <Input id="ds-disabled-field" disabled value="Disabled example" />
            <p className="text-xs text-muted-foreground">
              Disabled fields do not accept input or keyboard focus.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ds-notes">Example notes</Label>
            <Textarea
              id="ds-notes"
              rows={3}
              placeholder="Add a short introduction…"
              aria-describedby="ds-notes-help"
            />
            <p id="ds-notes-help" className="text-xs text-muted-foreground">
              Notes stay in this preview and are not sent to a server.
            </p>
          </div>
          <div className="flex items-start gap-3 sm:col-span-2">
            <Checkbox
              id="ds-checkbox"
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
              aria-describedby="ds-checkbox-help"
            />
            <div className="space-y-1">
              <Label htmlFor="ds-checkbox" className="cursor-pointer">
                Try a selected checkbox
              </Label>
              <p
                id="ds-checkbox-help"
                className="text-xs text-muted-foreground"
              >
                {checked
                  ? "Selected. This changes the example only."
                  : "Not selected. Press Space or choose the label to toggle."}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-4">
          <p id="ds-selected-purpose" className="text-xs text-muted-foreground">
            Selected example: {purpose.replaceAll("-", " ")}. No settings are
            saved.
          </p>
        </CardFooter>
      </Card>
    </ReferenceSection>
  );
}

function Overlays() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <ReferenceSection
      id="overlays"
      number="04"
      title="Focused moments, familiar controls"
      description="Dialogs and sheets include a title, a description, and a clear way back. Try Tab to move through the overlay, then Escape to close and return focus to its trigger."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h3 className="text-base">Dialog</h3>
            </CardTitle>
            <CardDescription>
              A focused, temporary task with a clear boundary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              This example contains a labeled input. Closing it dismisses the
              preview without saving anything.
            </p>
          </CardContent>
          <CardFooter>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button id="ds-dialog-trigger" variant="outline">
                  Open dialog example
                </Button>
              </DialogTrigger>
              <DialogContent id="ds-dialog" className="border-border">
                <DialogHeader>
                  <DialogTitle>Dialog example</DialogTitle>
                  <DialogDescription>
                    This is a component preview. No room or document will be
                    created.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="ds-dialog-name">Example name</Label>
                  <Input id="ds-dialog-name" defaultValue="Reference example" />
                </div>
                <DialogFooter>
                  <Button
                    id="ds-dialog-done"
                    onClick={() => setDialogOpen(false)}
                  >
                    Close example
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h3 className="text-base">Sheet</h3>
            </CardTitle>
            <CardDescription>
              A side panel that keeps the page in context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              The panel uses the current theme even though it renders outside
              the page content. It remains usable at narrow widths.
            </p>
          </CardContent>
          <CardFooter>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button id="ds-sheet-trigger" variant="outline">
                  Open sheet example
                </Button>
              </SheetTrigger>
              <SheetContent
                id="ds-sheet"
                side="right"
                className="flex w-full flex-col border-border sm:max-w-md"
              >
                <SheetHeader>
                  <SheetTitle>Sheet example</SheetTitle>
                  <SheetDescription>
                    Preview a supporting panel. These notes are local and are
                    not saved.
                  </SheetDescription>
                </SheetHeader>
                <div className="my-6 space-y-2">
                  <Label htmlFor="ds-sheet-notes">Example notes</Label>
                  <Textarea
                    id="ds-sheet-notes"
                    rows={5}
                    placeholder="Try typing in this panel…"
                  />
                </div>
                <Alert role="note">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Reference only</AlertTitle>
                  <AlertDescription>
                    Use Escape, the close icon, or the button below to return to
                    the page.
                  </AlertDescription>
                </Alert>
                <SheetFooter className="mt-auto pt-6">
                  <Button
                    id="ds-sheet-done"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close example
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </CardFooter>
        </Card>
      </div>
    </ReferenceSection>
  );
}

function States() {
  const [state, setState] = useState("default");
  return (
    <ReferenceSection
      id="states"
      number="05"
      title="Design the in-between states"
      description="A complete experience explains loading, failure, and absence as clearly as success. These cards show sample states; they do not reflect a live connection or workspace."
    >
      <Tabs value={state} onValueChange={setState}>
        <TabsList
          aria-label="Sample card state"
          className="mb-4 grid h-auto w-full max-w-md grid-cols-2 gap-1 sm:grid-cols-4"
        >
          {[
            { value: "default", label: "Default" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Error" },
            { value: "empty", label: "Empty" },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} id={`ds-state-${value}`} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="default">
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline">Sample data</Badge>
              </div>
              <CardTitle>
                <h3 className="text-lg">A clear place to start</h3>
              </CardTitle>
              <CardDescription>
                Use the full card composition to separate context, content, and
                the next action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {[
                  "Company overview.pdf",
                  "Financial summary.pdf",
                  "Introduction.pdf",
                ].map((name) => (
                  <li
                    key={name}
                    className="flex min-w-0 items-center gap-3 px-4 py-3"
                  >
                    <FileText
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words text-sm">{name}</span>
                    <Badge variant="secondary" className="ml-auto shrink-0">
                      Example
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Illustrative file names only. No documents are available for
                download.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="loading">
          <Card id="ds-loading-card" aria-busy="true">
            <CardHeader>
              <CardTitle>
                <h3 className="text-lg">Loading state</h3>
              </CardTitle>
              <CardDescription>
                A static skeleton preview. No network request is running.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" aria-hidden="true">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 bg-muted motion-reduce:animate-none" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3 bg-muted motion-reduce:animate-none" />
                      <Skeleton className="h-3 w-1/3 bg-muted motion-reduce:animate-none" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <span role="status" className="text-xs text-muted-foreground">
                Previewing loading placeholders.
              </span>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="error">
          <Card id="ds-error-card">
            <CardHeader>
              <CardTitle>
                <h3 className="text-lg">Error state</h3>
              </CardTitle>
              <CardDescription>
                Say what happened and offer a useful route forward.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <Info className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Example: files could not load</AlertTitle>
                <AlertDescription>
                  This is a sample error, not a live service failure. Keep
                  entered information and let people try again.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button
                id="ds-preview-recovery"
                variant="outline"
                onClick={() => setState("default")}
              >
                Preview recovery
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="empty">
          <Card id="ds-empty-card">
            <CardHeader>
              <CardTitle>
                <h3 className="text-lg">Empty state</h3>
              </CardTitle>
              <CardDescription>
                Explain what belongs here before asking someone to act.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <FolderOpen
                className="h-9 w-9 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium">No example documents here yet</p>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                A real room would explain how to add the first file. This
                reference can show the populated example instead.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Button variant="outline" onClick={() => setState("default")}>
                Show sample content
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </ReferenceSection>
  );
}

export function ComponentReference() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Head>
        <title>Component reference · {BRAND.name}</title>
        <meta
          name="description"
          content="Roomline's public component reference: semantic tokens, controls, fields, overlays, and sample states."
          key="description"
        />
        <meta name="robots" content="noindex, follow" />
      </Head>
      <a
        href="#reference-content"
        className="sr-only fixed left-4 top-3 z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
      >
        Skip to component reference
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {BRAND.name}
          </Link>
          <ThemeControls />
        </div>
      </header>
      <main id="reference-content" className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="py-10 sm:py-16">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Layers className="mr-1.5 h-3 w-3" aria-hidden="true" />
              Component reference
            </Badge>
            <span className="text-xs text-muted-foreground">
              Responsive web · Local examples
            </span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            One shared language.
            <br />
            <span className="text-muted-foreground">A clearer experience.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            The building blocks of {BRAND.name}, shown in the states that
            matter. Explore the controls, change the theme, and test the
            details.
          </p>
          <Alert role="note" className="mt-7 max-w-3xl">
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>A reference, not a live workspace</AlertTitle>
            <AlertDescription>
              All names and content are examples. Nothing here creates a room,
              changes access, or saves account settings.
            </AlertDescription>
          </Alert>
          <nav
            aria-label="Component sections"
            className="mt-7 flex flex-wrap gap-x-5 gap-y-3"
          >
            {navigation.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <Foundations />
        <Actions />
        <Inputs />
        <Overlays />
        <States />
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-7 text-xs text-muted-foreground">
          <p id="disabled-target">
            Disabled-anchor test target. Its activation count should remain
            zero.
          </p>
          <a
            href="https://ui.shadcn.com/docs/components/radix"
            className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Component documentation
          </a>
        </footer>
      </main>
    </div>
  );
}

import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Stack } from '@/components/custom/Stack/Stack'
import { Row } from '@/components/custom/Row/Row'
import { Grid } from '@/components/custom/Grid/Grid'
import { Button } from '@/components/custom/Button/Button'
import { Badge } from '@/components/custom/Badge/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'
import { Input } from '@/components/custom/Input/Input'
import { Textarea } from '@/components/custom/Textarea/Textarea'
import { Label } from '@/components/custom/Label/Label'
import { Avatar, AvatarFallback } from '@/components/custom/Avatar/Avatar'
import { AvatarGroup } from '@/components/custom/Avatar/AvatarGroup'
import { Progress } from '@/components/custom/Progress/Progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/custom/Dialog/Dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/providers/ThemeProvider'

import './playground.css'

export const Route = createFileRoute('/playground')({
  component: PlaygroundPage,
})

const COLOR_TOKENS = [
  '--color-background',
  '--color-primary',
  '--color-secondary',
  '--background',
  '--foreground',
  '--card',
  '--popover',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--destructive',
  '--border',
  '--ring',
]

const TEXT_SIZES = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl'] as const

const TEXT_WEIGHTS = [
  ['thin', 100],
  ['extralight', 200],
  ['light', 300],
  ['regular', 400],
  ['medium', 500],
  ['semibold', 600],
  ['bold', 700],
] as const

const GAP_SIZES = ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge'] as const

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="Playground__ThemeToggle" />
  return (
    <div className="Playground__ThemeToggle">
      {(['light', 'dark', 'system'] as const).map((t) => (
        <Button
          key={t}
          variant={theme === t ? 'primary' : 'secondary'}
          size="small"
          onClick={() => setTheme(t)}
        >
          {t[0].toUpperCase() + t.slice(1)}
        </Button>
      ))}
    </div>
  )
}

function PlaygroundPage() {
  return (
    <div className="Playground">
      <div className="Playground__Header">
        <h1 className="Playground__Title">Component Playground</h1>
        <ThemeToggle />
      </div>

      {/* Colors */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Color tokens</h2>
        <div className="Playground__Grid">
          {COLOR_TOKENS.map((token) => (
            <div key={token} className="Playground__Swatch">
              <div
                className="Playground__SwatchBox"
                style={{ backgroundColor: `var(${token})` }}
              />
              <code className="Playground__Token">{token}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Text sizes</h2>
        <Stack gap="small">
          {TEXT_SIZES.map((size) => (
            <Row key={size}>
              <code className="Playground__Label">--text-size-{size}</code>
              <span style={{ fontSize: `var(--text-size-${size})` }}>
                The quick brown fox jumps over the lazy dog
              </span>
            </Row>
          ))}
        </Stack>
      </section>

      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Text weights</h2>
        <Stack gap="small">
          {TEXT_WEIGHTS.map(([name]) => (
            <Row key={name}>
              <code className="Playground__Label">--text-weight-{name}</code>
              <span style={{ fontWeight: `var(--text-weight-${name})` }}>
                The quick brown fox jumps over the lazy dog
              </span>
            </Row>
          ))}
        </Stack>
      </section>

      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Headings</h2>
        <Stack gap="small">
          <h1 className="heading--1">Heading 1 — 3em, thin</h1>
          <h2 className="heading--2">Heading 2 — 2em, extralight</h2>
          <h3 className="heading--3">Heading 3 — uppercase, xs</h3>
          <h4 className="heading--4">Heading 4 — uppercase, xs</h4>
          <h5 className="heading--5">Heading 5 — sm, medium</h5>
          <h6 className="heading--6">Heading 6 — underline, medium</h6>
        </Stack>
      </section>

      {/* Spacing */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Gap scale (Stack / Row / Grid)</h2>
        <Stack gap="medium">
          {GAP_SIZES.map((gap) => (
            <div key={gap}>
              <code className="Playground__Label">gap="{gap}"</code>
              <Row gap={gap} style={{ marginTop: '0.5rem' }}>
                <div className="Playground__DemoBox">A</div>
                <div className="Playground__DemoBox">B</div>
                <div className="Playground__DemoBox">C</div>
              </Row>
            </div>
          ))}
        </Stack>
      </section>

      {/* Grid */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Grid columns</h2>
        <Stack gap="medium">
          {(['auto', '1', '2', '3', '4'] as const).map((columns) => (
            <div key={columns}>
              <code className="Playground__Label">columns="{columns}"</code>
              <Grid columns={columns} gap="small" style={{ marginTop: '0.5rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="Playground__DemoBox">
                    {i + 1}
                  </div>
                ))}
              </Grid>
            </div>
          ))}
        </Stack>
      </section>

      {/* Buttons */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Buttons</h2>
        <Stack gap="medium">
          <Row>
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row>
            <Button size="small">Small</Button>
            <Button>Default size</Button>
            <Button full>Full width…</Button>
          </Row>
          <Row>
            <Button variant="primary" destructive>
              Destructive primary
            </Button>
            <Button variant="secondary" destructive>
              Destructive secondary
            </Button>
            <Button disabled>Disabled</Button>
          </Row>
        </Stack>
      </section>

      {/* Badges */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Badges</h2>
        <Row>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
        </Row>
      </section>

      {/* Cards */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Cards</h2>
        <Grid columns="3" gap="medium">
          <Card>
            <CardHeader>
              <CardTitle>Default card</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Some description text inside the card.</CardDescription>
            </CardContent>
          </Card>
          <Card state="active">
            <CardHeader>
              <CardTitle>Active state</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Card with state="active".</CardDescription>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="small">
                Action
              </Button>
            </CardFooter>
          </Card>
          <Card state="error">
            <CardHeader>
              <CardTitle>Error state</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Card with state="error".</CardDescription>
            </CardContent>
          </Card>
        </Grid>
      </section>

      {/* Form inputs */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Inputs &amp; fields</h2>
        <Card>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pg-email">Email</FieldLabel>
                <Input id="pg-email" type="email" placeholder="you@example.com" />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-name">Name</FieldLabel>
                <Input id="pg-name" placeholder="Jane" />
              </Field>
              <Field>
                <FieldLabel htmlFor="pg-bio">Bio</FieldLabel>
                <Textarea id="pg-bio" placeholder="Tell us about yourself" rows={3} />
              </Field>
              <Field>
                <Label htmlFor="pg-disabled">Disabled</Label>
                <Input id="pg-disabled" disabled value="Read-only value" />
              </Field>
              <Field>
                <Checkbox id="pg-check" label="Accept terms and conditions" />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </section>

      {/* Avatars */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Avatars</h2>
        <Stack gap="medium">
          <Row>
            <code className="Playground__Label">size="sm"</code>
            <Avatar size="sm">
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
          </Row>
          <Row>
            <code className="Playground__Label">AvatarGroup</code>
            <AvatarGroup
              size="md"
              max={4}
              items={[
                { id: '1', fallback: 'MS' },
                { id: '2', fallback: 'JD' },
                { id: '3', fallback: 'AB' },
                { id: '4', fallback: 'CD' },
                { id: '5', fallback: 'EF' },
                { id: '6', fallback: 'GH' },
              ]}
            />
          </Row>
        </Stack>
      </section>

      {/* Progress + Spinner */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Progress &amp; spinner</h2>
        <Stack gap="medium">
          <Progress value={25} label="25%" />
          <Progress value={66} label="2 of 3 complete" />
          <Progress value={100} label="Done" />
          <Row>
            <code className="Playground__Label">Spinner</code>
            <Spinner />
          </Row>
        </Stack>
      </section>

      {/* Overlays */}
      <section className="Playground__Section">
        <h2 className="Playground__SectionTitle">Overlays</h2>
        <Row>
          <Dialog>
            <DialogTrigger render={<Button variant="primary">Open Dialog</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sample dialog</DialogTitle>
                <DialogDescription>
                  This is the description text inside the dialog.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary">Cancel</Button>
                <Button variant="primary">Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="secondary">Open Menu</Button>} />
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </section>
    </div>
  )
}

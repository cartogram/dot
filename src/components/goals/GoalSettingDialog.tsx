import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { IconTarget } from '@tabler/icons-react'
import type { YearlyGoals } from '@/types/strava'
import { saveGoals, getStoredGoals } from '@/lib/goals/storage'

export function GoalSettingDialog() {
  const [open, setOpen] = React.useState(false)
  const [goals, setGoals] = React.useState<YearlyGoals>(() => {
    const stored = getStoredGoals()
    return {
      ...stored,
      visibility: stored.visibility || { rides: true, runs: true, swims: true },
    }
  })

  const handleSave = () => {
    saveGoals(goals)
    setOpen(false)
    // Force page reload to refresh stats with new goals
    window.location.reload()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <IconTarget data-icon="inline-start" />
        Set Goals
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set Your Yearly Goals</AlertDialogTitle>
          <AlertDialogDescription>
            Set targets for your year-to-date activities
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FieldGroup className="py-4 space-y-4">
          {/* Ride Goals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Rides</div>
              <Checkbox
                checked={goals.visibility?.rides}
                onCheckedChange={(checked) =>
                  setGoals({
                    ...goals,
                    visibility: {
                      ...goals.visibility!,
                      rides: checked === true,
                    },
                  })
                }
                label="Show"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="ride-distance">Distance (km)</FieldLabel>
                <Input
                  id="ride-distance"
                  type="number"
                  placeholder="5000"
                  value={goals.rides?.distance ? goals.rides.distance / 1000 : ''}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      rides: {
                        ...goals.rides,
                        distance: parseFloat(e.target.value) * 1000,
                      },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ride-count">Activities</FieldLabel>
                <Input
                  id="ride-count"
                  type="number"
                  placeholder="100"
                  value={goals.rides?.count ?? ''}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      rides: {
                        ...goals.rides,
                        count: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {/* Run Goals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Runs</div>
              <Checkbox
                checked={goals.visibility?.runs}
                onCheckedChange={(checked) =>
                  setGoals({
                    ...goals,
                    visibility: {
                      ...goals.visibility!,
                      runs: checked === true,
                    },
                  })
                }
                label="Show"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="run-distance">Distance (km)</FieldLabel>
                <Input
                  id="run-distance"
                  type="number"
                  placeholder="3700"
                  value={goals.runs?.distance ? goals.runs.distance / 1000 : ''}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      runs: {
                        ...goals.runs,
                        distance: parseFloat(e.target.value) * 1000,
                      },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="run-count">Activities</FieldLabel>
                <Input
                  id="run-count"
                  type="number"
                  placeholder="200"
                  value={goals.runs?.count ?? ''}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      runs: {
                        ...goals.runs,
                        count: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {/* Swim Goals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Swims</div>
              <Checkbox
                checked={goals.visibility?.swims}
                onCheckedChange={(checked) =>
                  setGoals({
                    ...goals,
                    visibility: {
                      ...goals.visibility!,
                      swims: checked === true,
                    },
                  })
                }
                label="Show"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="swim-distance">Distance (km)</FieldLabel>
                <Input
                  id="swim-distance"
                  type="number"
                  placeholder="100"
                  value={goals.swims?.distance ? goals.swims.distance / 1000 : ''}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      swims: {
                        ...goals.swims,
                        distance: parseFloat(e.target.value) * 1000,
                      },
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="swim-count">Activities</FieldLabel>
                <Input
                  id="swim-count"
                  type="number"
                  placeholder="50"
                  value={goals.swims?.count ?? ''}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      swims: {
                        ...goals.swims,
                        count: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>
          </div>
        </FieldGroup>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save Goals</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

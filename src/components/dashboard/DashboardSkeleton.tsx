import { Card, CardContent, CardHeader, CardTitle } from '@/components/custom/Card'
import { Spinner } from '@/components/ui/spinner'
import { Grid } from '@/components/custom/Grid/Grid'
import { Stack } from '@/components/custom/Stack/Stack'
import { Row } from '@/components/custom/Row/Row'

import './dashboard-skeleton.css'

export function DashboardSkeleton() {
  return (
    <Stack gap="large">
      <Grid columns="3" gap="large">
        {[1, 2, 3].map((i) => (
          <Card key={i} state="loading" className="u-animate-pulse">
            <CardHeader>
              <CardTitle>Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <Spinner className="DashboardSkeleton__SpinnerCentre" />
            </CardContent>
          </Card>
        ))}
      </Grid>
    </Stack>
  )
}

export function CardSkeleton() {
  return (
    <Card className="u-animate-pulse">
      <CardHeader>
        <div className="DashboardSkeleton__Bar DashboardSkeleton__Bar--h6 DashboardSkeleton__Bar--w32" style={{ marginBottom: '0.5rem' }} />
        <div className="DashboardSkeleton__Bar DashboardSkeleton__Bar--h4 DashboardSkeleton__Bar--w24" />
      </CardHeader>
      <CardContent>
        <Stack gap="small">
          <div className="DashboardSkeleton__Bar DashboardSkeleton__Bar--h16" />
          <div className="DashboardSkeleton__Bar DashboardSkeleton__Bar--h2 DashboardSkeleton__Bar--w-full" />
          <Row gap="medium">
            <div className="DashboardSkeleton__Bar DashboardSkeleton__Bar--h10 DashboardSkeleton__Bar--flex" />
            <div className="DashboardSkeleton__Bar DashboardSkeleton__Bar--h10 DashboardSkeleton__Bar--flex" />
          </Row>
        </Stack>
      </CardContent>
    </Card>
  )
}

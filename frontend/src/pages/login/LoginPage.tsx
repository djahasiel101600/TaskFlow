import { ClipboardList } from 'lucide-react'
import { LoginForm } from '@/features/auth/login-form'
import { Card, CardContent } from '@/shared/ui/card'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ClipboardList className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">TaskFlow</h1>
            <p className="text-muted-foreground text-sm mt-1">
              COA Task & Communication Management
            </p>
          </div>
        </div>
        <Card className="w-full shadow-md border-border/80">
          <CardContent className="pt-6 pb-6">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

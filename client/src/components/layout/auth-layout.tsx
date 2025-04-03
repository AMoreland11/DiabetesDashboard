import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Link } from "wouter";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  footer?: React.ReactNode;
}

export function AuthLayout({ children, title, description, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Clock className="h-7 w-7 text-white" />
          </div>
        </div>
        
        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
        
        {!footer && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {title.includes("Register") ? (
                <>
                  Already have an account?{" "}
                  <Link href="/login">
                    <a className="font-medium text-primary hover:text-primary-dark">
                      Sign in
                    </a>
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Link href="/register">
                    <a className="font-medium text-primary hover:text-primary-dark">
                      Sign up
                    </a>
                  </Link>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

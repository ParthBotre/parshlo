import { Loader2 } from 'lucide-react';

export default function Loading(): JSX.Element {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center">
      <Loader2 className="text-primary h-6 w-6 animate-spin" />
    </div>
  );
}

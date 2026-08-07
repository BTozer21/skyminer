import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function JobAssignmentDialog(open: boolean, id: number, name: string,) {

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            This is {name} job
          </DialogTitle>
          <DialogDescription>Edit team or dates fro the {id}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

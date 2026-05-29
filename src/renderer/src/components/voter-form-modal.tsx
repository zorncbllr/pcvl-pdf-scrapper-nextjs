import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { useModalStore } from "@/stores/modal-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import LoadingButton from "@/components/ui/loading-button";
import { useVoterStore } from "@/stores/voter-store";

const voterSchema = z.object({
  name: z
    .string()
    .regex(
      /^[A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+)*(?: (?:Jr\.?|Sr\.?|I{1,3}|IV))?, [A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+)*(?: (?:Jr\.?|Sr\.?|I{1,3}|IV))?(?: [A-Z][a-zA-Z'-]+)?$/,
      "Invalid name format. Use: LASTNAME, FIRSTNAME MIDDLENAME"
    ),
  precinct: z
    .string()
    .regex(
      /^\d{4}[A-Z]$/,
      "Format: 4 digits + 1 uppercase letter (e.g., 0073A)"
    ),
});

export default function VoterFormModal() {
  const { openForm, setOpenForm } = useModalStore();
  const [creating, setCreating] = useState(false);
  const fetchVoters = useVoterStore((s) => s.fetchVoters);

  const form = useForm<z.infer<typeof voterSchema>>({
    resolver: zodResolver(voterSchema),
    defaultValues: {
      name: "",
      precinct: "",
    },
  });

  const submitHandler = (value: z.infer<typeof voterSchema>) => {
    setCreating(true);

    window.electronAPI.addVoter(value).then(async (res) => {
      if (res.success) {
        setOpenForm(false);
        toast({
          title: res.msg,
          description: "You can manage them now in voters table.",
        });
        await fetchVoters();
      } else {
        form.setError("name", {
          message: res.msg,
        });
      }

      setCreating(false);
    });
  };

  useEffect(() => {
    setTimeout(() => {
      form.reset({
        name: "",
        precinct: "",
      });
      setCreating(false);
    }, 500);
  }, [openForm]);

  return (
    <Dialog open={openForm} onClose={setOpenForm} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <Form {...form}>
            <form
              className="w-[30rem]"
              onSubmit={form.handleSubmit(submitHandler)}
            >
              <DialogPanel
                transition
                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary sm:mx-0 sm:size-10">
                      <UserPlusIcon
                        aria-hidden="true"
                        className="size-6 text-primary"
                      />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <DialogTitle
                        as="h3"
                        className="text-base font-semibold text-gray-900"
                      >
                        Add New Record
                      </DialogTitle>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Please fill all required fields to continue.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-10 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="DOE, JOHN MARTIN"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the full name of the voter.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="precinct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precinct</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0073A"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the voter's assigned precinct number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-gray-50 px-4 gap-2 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  {creating ? (
                    <LoadingButton variant={"default"} label="Creating" />
                  ) : (
                    <Button type="submit">Create</Button>
                  )}

                  <Button
                    type="button"
                    disabled={creating}
                    variant={"secondary"}
                    onClick={() => setOpenForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogPanel>
            </form>
          </Form>
        </div>
      </div>
    </Dialog>
  );
}

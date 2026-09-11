import { revalidatePath } from "next/cache";

export function revalidateDispatch() {
  revalidatePath("/dispatch");
}

export function revalidateStaffNotices() {
  revalidatePath("/", "layout");
  revalidatePath("/dispatch");
}

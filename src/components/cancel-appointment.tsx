import { cancelAppointment } from "@/app/book/actions";
import { SubmitButton } from "./submit-button";
export function CancelAppointment({
  id,
  business = false,
}: {
  id: string;
  business?: boolean;
}) {
  return (
    <details className="cancel-details">
      <summary>Cancel appointment</summary>
      <p>This will release the reserved time. Cancel this appointment?</p>
      <form action={cancelAppointment}>
        <input type="hidden" name="appointment_id" value={id} />
        {business && <input type="hidden" name="return_to" value="business" />}
        <SubmitButton>Yes, cancel appointment</SubmitButton>
      </form>
    </details>
  );
}

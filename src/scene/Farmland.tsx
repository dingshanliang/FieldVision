import { fields } from "../data/fields";
import { FieldParcel } from "./FieldParcel";

export function Farmland() {
  return <group>{fields.map((field) => <FieldParcel key={field.id} field={field} />)}</group>;
}

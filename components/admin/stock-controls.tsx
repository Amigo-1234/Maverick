import { changeStock } from "@/app/admin/actions";
import { Submit } from "./submit";
import { StockPill } from "./ui";

/** Add / remove / set stock for one size, plus one-click sold out and restore. */
export function StockControls({ variantId, stock, lowAt, back, label }: { variantId: number; stock: number; lowAt: number; back: string; label: string }) {
  const hidden = (<><input type="hidden" name="variantId" value={variantId} /><input type="hidden" name="back" value={back} /></>);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StockPill stock={stock} lowAt={lowAt} />
      <form action={changeStock} className="flex items-center gap-1" aria-label={`Change stock for ${label}`}>
        {hidden}
        <label htmlFor={`amt-${variantId}`} className="sr-only">Amount for {label}</label>
        <input id={`amt-${variantId}`} name="amount" type="number" min={0} defaultValue={stock || ""} placeholder="0" className="w-16 border-[1.5px] border-foreground/20 bg-background px-2 py-1.5 text-sm tabular-nums" />
        <select name="mode" aria-label="How to change stock" defaultValue="set" className="border-[1.5px] border-foreground/20 bg-background px-1.5 py-1.5 text-[12px]">
          <option value="set">Set to</option><option value="add">Add</option><option value="remove">Remove</option>
        </select>
        <input name="note" placeholder="Note" aria-label="Note" className="hidden w-28 border-[1.5px] border-foreground/20 bg-background px-2 py-1.5 text-[12px] md:block" />
        <Submit className="btn btn-sm" pendingText="…">Save</Submit>
      </form>
      {stock > 0 ? (
        <form action={changeStock}>{hidden}<input type="hidden" name="mode" value="set" /><input type="hidden" name="soldOut" value="1" /><input type="hidden" name="amount" value="0" /><input type="hidden" name="note" value="Marked sold out" />
          <Submit className="btn-ghost btn-sm" pendingText="…" confirm={`Mark ${label} as sold out?`}>Sold out</Submit></form>
      ) : (
        <form action={changeStock} className="flex items-center gap-1">{hidden}<input type="hidden" name="mode" value="set" /><input type="hidden" name="note" value="Restored" />
          <label htmlFor={`restore-${variantId}`} className="sr-only">Restore quantity</label>
          <input id={`restore-${variantId}`} name="amount" type="number" min={1} defaultValue={5} className="w-14 border-[1.5px] border-foreground/20 bg-background px-2 py-1.5 text-sm" />
          <Submit className="btn-ghost btn-sm" pendingText="…">Restore</Submit></form>
      )}
    </div>
  );
}

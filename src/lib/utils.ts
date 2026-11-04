export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Format INTEGER PAISE as Indian INR (storage unit across the whole app). */
export function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** ₹ → paise for admin form inputs. */
export function toPaise(rupees: number) {
  return Math.round(rupees * 100);
}

/** paise → ₹ for pre-filling admin inputs. */
export function fromPaise(paise: number) {
  return paise / 100;
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

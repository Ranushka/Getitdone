// Whether a job's scheduled visit time makes sense for the kind of address
// it's at — used both for the create-job form's inline hint and as a hard
// server-side check. The rule of thumb: an office is empty outside business
// hours' weekdays, a home is empty *during* them (whoever lives there is at
// work), so each type looks for the other's dead time.
export const BUSINESS_HOURS_START = 9
export const BUSINESS_HOURS_END = 18

export type AddressType = 'home' | 'office'

export function isValidScheduleForAddressType(type: AddressType, date: Date): boolean {
  const day = date.getDay() // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6
  const hour = date.getHours()
  const isBusinessHours = hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END

  if (type === 'office') return !isWeekend
  // type === 'home'
  return !isBusinessHours
}

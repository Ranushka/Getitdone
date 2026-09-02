import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isValidScheduleForAddressType, type AddressType, type CreateAddressInput } from '@getitdone/shared'
import { trpc } from '@/lib/trpc'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface AddressAndScheduleValue {
  addressId?: number
  newAddress?: CreateAddressInput
  scheduledAt?: string
  /** True when scheduledAt falls in the resolved address type's dead time. */
  hasScheduleConflict: boolean
}

const ADD_NEW_VALUE = '__new__'

/**
 * Job-creation-only address book + visit-timing picker: choose a saved
 * address or add a new one inline, then optionally pick a visit datetime —
 * warned inline (not blocked) if it falls in the address type's dead time
 * (weekends for an office, working hours for a home).
 */
export function AddressAndScheduleFields({ onChange }: { onChange: (value: AddressAndScheduleValue) => void }) {
  const { t } = useTranslation()
  const { data: savedAddresses } = trpc.addresses.list.useQuery()
  const [selection, setSelection] = useState<string>('')
  const [newLabel, setNewLabel] = useState('')
  const [newLine1, setNewLine1] = useState('')
  const [newType, setNewType] = useState<AddressType>('home')
  const [scheduledAt, setScheduledAt] = useState('')

  const isAddingNew = selection === ADD_NEW_VALUE
  const selectedSaved = savedAddresses?.find((a) => String(a.id) === selection)
  const resolvedType: AddressType | undefined = isAddingNew ? newType : selectedSaved?.type

  function emit(patch: Partial<{ selection: string; newLabel: string; newLine1: string; newType: AddressType; scheduledAt: string }>) {
    const next = {
      selection: patch.selection ?? selection,
      newLabel: patch.newLabel ?? newLabel,
      newLine1: patch.newLine1 ?? newLine1,
      newType: patch.newType ?? newType,
      scheduledAt: patch.scheduledAt ?? scheduledAt,
    }
    const type: AddressType | undefined =
      next.selection === ADD_NEW_VALUE ? next.newType : savedAddresses?.find((a) => String(a.id) === next.selection)?.type

    const value: AddressAndScheduleValue = {
      scheduledAt: next.scheduledAt ? new Date(next.scheduledAt).toISOString() : undefined,
      hasScheduleConflict: !!(next.scheduledAt && type && !isValidScheduleForAddressType(type, new Date(next.scheduledAt))),
    }
    if (next.selection === ADD_NEW_VALUE) {
      if (next.newLabel.trim() && next.newLine1.trim()) {
        value.newAddress = { label: next.newLabel.trim(), line1: next.newLine1.trim(), type: next.newType }
      }
    } else if (next.selection) {
      value.addressId = Number(next.selection)
    }
    onChange(value)
  }

  const scheduleWarning =
    scheduledAt && resolvedType && !isValidScheduleForAddressType(resolvedType, new Date(scheduledAt))
      ? resolvedType === 'office'
        ? t('jobs.scheduleWarningOffice')
        : t('jobs.scheduleWarningHome')
      : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">{t('jobs.addressLabel')}</Label>
        <select
          id="address"
          value={selection}
          onChange={(e) => {
            setSelection(e.target.value)
            emit({ selection: e.target.value })
          }}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="">{t('jobs.addressNone')}</option>
          {savedAddresses?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.line1} ({a.type === 'office' ? t('jobs.addressTypeOffice') : t('jobs.addressTypeHome')})
            </option>
          ))}
          <option value={ADD_NEW_VALUE}>{t('jobs.addressAddNew')}</option>
        </select>
      </div>

      {isAddingNew ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Input
            placeholder={t('jobs.addressLabelPlaceholder')}
            value={newLabel}
            onChange={(e) => {
              setNewLabel(e.target.value)
              emit({ newLabel: e.target.value })
            }}
          />
          <Input
            placeholder={t('jobs.addressLine1Placeholder')}
            value={newLine1}
            onChange={(e) => {
              setNewLine1(e.target.value)
              emit({ newLine1: e.target.value })
            }}
          />
          <div className="flex gap-2">
            {(['home', 'office'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setNewType(type)
                  emit({ newType: type })
                }}
                className={cn(
                  'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium',
                  newType === type
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-card text-muted-foreground',
                )}
              >
                {type === 'home' ? t('jobs.addressTypeHome') : t('jobs.addressTypeOffice')}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scheduledAt">{t('jobs.scheduledAtLabel')}</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => {
            setScheduledAt(e.target.value)
            emit({ scheduledAt: e.target.value })
          }}
        />
        {scheduleWarning ? <p className="text-xs text-destructive">{scheduleWarning}</p> : null}
      </div>
    </div>
  )
}

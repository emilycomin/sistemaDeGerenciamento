import { DatePickerInput } from '@mantine/dates'
import 'dayjs/locale/pt-br'
import dayjs from 'dayjs'

interface DateFieldProps {
  label: string
  value: string          // ISO yyyy-MM-dd
  onChange: (val: string) => void
  minDate?: string       // ISO yyyy-MM-dd
  maxDate?: string
  placeholder?: string
  required?: boolean
  size?: 'sm' | 'md'
}

/**
 * Campo de data com calendário Mantine estilizado para combinar com os
 * campos MUI outlined da aplicação (label shrink no topo, borda cinza,
 * foco azul #0066CC).
 */
export default function DateField({
  label, value, onChange, minDate, maxDate, placeholder, required, size = 'sm',
}: DateFieldProps) {

  const parsed  = value ? dayjs(value).toDate() : null
  const minD    = minDate ? dayjs(minDate).toDate() : undefined
  const maxD    = maxDate ? dayjs(maxDate).toDate() : undefined

  return (
    <DatePickerInput
      locale="pt-br"
      valueFormat="DD/MM/YYYY"
      label={label}
      placeholder={placeholder ?? 'DD/MM/AAAA'}
      value={parsed}
      minDate={minD}
      maxDate={maxD}
      required={required}
      onChange={(date) => {
        if (date) onChange(dayjs(date).format('YYYY-MM-DD'))
        else onChange('')
      }}
      size={size}
      /* ── Visual idêntico ao TextField MUI outlined + shrink ──────────── */
      styles={{
        root: { width: '100%' },
        label: {
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#6B7280',
          marginBottom: '2px',
          lineHeight: 1.4,
        },
        input: {
          height: size === 'sm' ? '40px' : '48px',
          fontSize: '0.875rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#1A1A1A',
          backgroundColor: '#fff',
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.23)',
          padding: '0 14px',
          transition: 'border-color 0.2s',
          '&:focus': {
            borderColor: '#0066CC',
            boxShadow: '0 0 0 1px #0066CC',
          },
          '&:hover': { borderColor: 'rgba(0,0,0,0.87)' },
        },
        /* Calendário popup */
        calendarHeader: { padding: '8px 12px' },
        calendarHeaderControl: {
          color: '#0066CC',
          borderRadius: '6px',
          '&:hover': { backgroundColor: '#E8F0FF' },
        },
        calendarHeaderLevel: {
          fontWeight: 600,
          fontSize: '0.875rem',
          color: '#1A1A1A',
          '&:hover': { backgroundColor: '#E8F0FF', borderRadius: '6px' },
        },
        monthThead: { borderBottom: '1px solid #E9ECEF' },
        weekday: {
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#9CA3AF',
          textTransform: 'uppercase',
        },
        day: {
          borderRadius: '6px',
          fontSize: '0.83rem',
          fontWeight: 500,
          color: '#374151',
          '&[data-selected]': {
            backgroundColor: '#0066CC',
            color: '#fff',
            fontWeight: 700,
          },
          '&[data-today]': {
            border: '1.5px solid #0066CC',
            color: '#0066CC',
            fontWeight: 700,
          },
          '&:hover:not([data-selected])': {
            backgroundColor: '#E8F0FF',
            color: '#0066CC',
          },
          '&[data-outside]': { color: '#D1D5DB' },
          '&[data-disabled]': { color: '#E5E7EB', cursor: 'not-allowed' },
        },
        dropdown: {
          border: '1px solid #E9ECEF',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          padding: '12px',
        },
      }}
    />
  )
}

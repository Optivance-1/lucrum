import { Resend } from 'resend'
import { getUserEmail } from '@/lib/user-state'

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmailToAddress(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  const resend = getResendClient()
  if (!resend || !to) return false

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      text,
    })
    return true
  } catch (error) {
    console.error('[email] send failed:', error)
    return false
  }
}

export async function sendEmailToUserId(
  userId: string,
  subject: string,
  text: string
): Promise<boolean> {
  const email = await getUserEmail(userId)
  if (!email) return false
  return sendEmailToAddress(email, subject, text)
}

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_PASSWORD_RESET_HOOK_SECRET') as string

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token_hash, redirect_to },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token_hash: string
        redirect_to: string
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const resetUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${redirect_to}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 12px;">
            <tr>
              <td>
                <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0;">Reset Your Password</h1>
                <p style="color: #333; font-size: 14px; line-height: 24px; margin: 24px 0;">
                  Click the button below to reset your password. This link will expire in 24 hours for security reasons.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding: 24px 0;">
                      <a href="${resetUrl}" style="display: inline-block; background-color: #2754C5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 5px; font-size: 16px; font-weight: bold;">Reset Password</a>
                    </td>
                  </tr>
                </table>
                <p style="color: #333; font-size: 14px; line-height: 24px; margin: 24px 0;">
                  Or copy and paste this link in your browser:
                </p>
                <p style="display: inline-block; padding: 16px; width: 90%; background-color: #f4f4f4; border-radius: 5px; border: 1px solid #eee; color: #333; word-break: break-all; font-size: 12px;">
                  ${resetUrl}
                </p>
                <p style="color: #ababab; font-size: 14px; line-height: 24px; margin-top: 24px;">
                  If you didn't request this password reset, you can safely ignore this email.
                </p>
                <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
                  FF Network - Your Professional Network Tracker
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    const { error } = await resend.emails.send({
      from: 'FF Network <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Reset Your Password',
      html,
    })
    
    if (error) {
      throw error
    }
  } catch (error) {
    console.log(error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: (error as any).code,
          message: (error as any).message,
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', 'application/json')
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: responseHeaders,
  })
})

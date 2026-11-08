# Quote follow-ups and the one-tap answers

What a customer gets after a quote, and what their answer does. The wording
is in `lib/quotes/followUpContent.ts` (the follow-ups), `answerTypes.ts` (the
buttons and the two emails a tap sends) and `journeyContent.ts` (what happens
next after a sale and a booking). The layout every customer email shares is
`lib/email/premium.ts › letterHtml`: white, no banner, a photo where it helps,
signed by a person.

## The follow-ups

Four emails over a fortnight for hot water and split systems, three for
anything else, each a check-in with something useful in it rather than "did
you get our quote":

| | Hot water | Split system | Anything else |
|---|---|---|---|
| Day 2 | Checking in, the common questions | Checking in, the common questions | Checking in |
| Day 5 | What it saves (the figures) | Our brands and our work | — |
| Day 6 | — | — | How we work |
| Day 9 | Our brands and our work | What it costs to run | — |
| Day 14 | Before I close off (the closer) | Before I close off | Before I close off |

Hot water pushes the Reclaim ECO R290 300 L first, the Reclaim CO₂ split as
the premium option and iStore as the budget one, never Thermann (Jake, 8 Nov).
Every figure is one the website already states.

**Sending them isn't built yet.** The wording is there and the previews go to
Jake from Settings; the engine that sends them on the day (and stops on an
answer or a sale) is the next piece.

## The buttons

Every follow-up ends with three buttons: **Let's go ahead**, **I've got a
question**, **Not this time**. Each opens a page with one button to confirm
(opening a link alone does nothing, because mail scanners open every link),
and the question and no pages have a box to type a line.

Pressing the button does four things (`lib/quotes/answers.ts`):

1. **The office gets the customer's message**, written in their words and
   addressed to whoever quoted it: "Yes please, let's go ahead with the
   Reclaim 300L ($3,060.50) at Berwick. Give me a call on 0412 345 678, or
   reply to this email to pick a day." It's signed by the customer with their
   mobile and email, has a button to the job in ServiceTitan, and **Reply goes
   to the customer**: the email's reply-to is their address. It arrives from
   `quotes@` as "Sarah Jones via Advanced Gas & Aircon", to admin@ and jake@.
2. **The customer gets what happens next**, from whoever quoted them (their
   photo when we have one). A yes gets the four steps: we call within the
   business day to pick a day, we order the system and line up the
   electrician, the day itself, then the rebate paperwork and the compliance
   certificate. A question gets "I've got it, I'll call you"; a no gets "no
   worries, your quote's closed, reply any time".
3. **The Pipeline hears about it**: a touch on the quote saying what they
   tapped. A no marks the quote lost ("Not going ahead") there, dismisses its
   open options in ServiceTitan and puts a note on the job, the same as Mark
   lost on the Pipeline does. A yes or a question puts a note on the job.
4. **The answer is kept** (`portal_quote_answers`), one per quote and answer,
   so pressing twice doesn't email twice, and so the follow-ups for that quote
   stop.

The emails only go if nothing has been recorded for that quote and answer
before. A customer with no email address in ServiceTitan still gets the
office emailed; they just don't get the reply.

### The preview

The follow-up previews use quote 0, which is made up. Its buttons open the
real pages, and pressing one sends **both emails to Jake** instead of the
office and the customer, with "[Preview: what you get]" and "[Preview: what
the customer gets]" in the subject. Nothing is recorded for it.

## After the sale

**Thanks for going ahead** is written and previewed but not yet sent: the
same four steps as the yes reply, for a quote sold on the phone or in person
rather than by the button. It needs a trigger reading ServiceTitan: an
estimate going to Sold in the sync, where no yes was tapped.

There's no "you're booked in" email from us. ServiceTitan sends its own
booking confirmation with the day and arrival window, so the steps say one is
coming rather than sending a second.

## Previews

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.advancedgas.com.au/api/previews/customer-emails?only=answers,journey"
```

`only` takes any of `follow-ups`, `answers`, `journey`, `review`; without it,
everything goes (sixteen emails). They only ever go to Jake.

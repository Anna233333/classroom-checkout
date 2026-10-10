# Classroom Checkout

A colorful, local-only classroom checkout prototype built with plain HTML, CSS, and JavaScript. It has no login, database, analytics, or external network requests.

## Open locally

Double-click `index.html`, or run a local server from this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Student view

- A responsive roster of 20 animal avatars is the first and primary step.
- In Optional Buddy mode, the first avatar selects the student. A second avatar selects a buddy and opens the trip dialog, while **Continue Solo** opens it for one student.
- In Buddy Required mode, students tap two available animal avatars before the trip dialog opens. Solo Only keeps the one-tap flow.
- The trip dialog contains destination and floor choices without a scrolling buddy menu. **Change students** returns to the roster chooser.
- Students with an active request reopen the dialog to see their queue position, accept an offered pass, choose Not Ready or Ready Now, or mark themselves back.
- Three compact bathroom chips show whether each pass is available, offered, or in use and show its queue count.
- Buddy pairs share one request, queue position, pass, departure, and return.

## Teacher dashboard

The dashboard includes named active trips, bathroom queues, and returned-trip history with clearly labeled departure time, return time, and total time out. Teachers can use **Mark Returned** on an active trip; buddy pairs return together, bathroom passes are released, and the next eligible request is offered the pass. Its buddy control affects new requests only:

The private **Check-in reminders** panel appears when a bathroom trip exceeds the student’s check-in time (10 minutes by default) or when an individual student has made three or more bathroom departures during the current browser session. Buddy trips count once for each participating student. Nurse, office, and other-classroom trips do not count toward frequency reminders. Active-trip and scheduled reminders refresh automatically every 30 seconds.

The teacher-only **Student Supports** area can replace the 10-minute bathroom check-in time for an individual student and add one daily Nurse, Office, or Other Classroom reminder. A scheduled reminder appears from 10 minutes before through 30 minutes after its time until the student signs out, and the student’s checkout dialog preselects the scheduled destination. Supports remain in memory for the current browser session and reset on refresh.

The teacher-only **Avatar Editor** uses the classroom’s existing animal icons. Teachers can change a student’s display name, animal or creature, and one optional accessory. Names must be unique and 1–14 characters. Customizations update throughout the roster and dashboard and reset on refresh; background colors are not customized.

- **Optional Buddy** is the default. Students may go alone or choose one available buddy.
- **Buddy Required** blocks a new request until an available buddy is selected.
- **Solo Only** hides buddy selection and creates individual requests.

The buddy setting exists only in memory and resets to Optional Buddy whenever the page refreshes. Changing it does not modify queued, offered, or active requests.

## Queue algorithm

Each bathroom type has one pass shared across both floors. An available pass is used immediately when nobody is waiting. Otherwise, a request joins that bathroom’s queue. When the pass returns, it is offered to the first eligible waiting request. Not Ready preserves the request’s original array position while allowing the next eligible request to receive the offer. An existing offer is never displaced when an earlier request becomes ready again.

All data resets when the page refreshes.

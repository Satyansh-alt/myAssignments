from datetime import datetime, timedelta

RECURRENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}


def occurrences_in_range(assignment, range_start: datetime, range_end: datetime) -> list[datetime]:
    """Expand a single assignment into its concrete due-date occurrences within [range_start, range_end]."""
    if not assignment.due_date:
        return []

    if assignment.is_recurring and assignment.recurrence_pattern:
        delta = timedelta(days=RECURRENCE_DAYS.get(assignment.recurrence_pattern, 7))
        due = assignment.due_date
        while due < range_start:
            due += delta
            if assignment.recurrence_end_date and due.date() > assignment.recurrence_end_date:
                return []

        results = []
        candidate = due
        while candidate <= range_end:
            if assignment.recurrence_end_date and candidate.date() > assignment.recurrence_end_date:
                break
            results.append(candidate)
            candidate += delta
        return results

    if range_start <= assignment.due_date <= range_end:
        return [assignment.due_date]
    return []

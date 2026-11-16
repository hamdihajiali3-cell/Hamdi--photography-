const formatDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const formatMonth = new Intl.DateTimeFormat('tr-TR', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const pad = value => String(value).padStart(2, '0');

function asDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fieldsetFor(input) {
  const label = input.closest('label');
  const field = input.ownerDocument.createElement('fieldset');
  const legend = input.ownerDocument.createElement('legend');
  field.className = 'turkish-schedule-field';
  field.lang = 'tr';
  legend.textContent = label.textContent.trim();
  label.replaceWith(field);
  input.type = 'hidden';
  field.append(legend, input);
  return field;
}

function selectValue(input, value) {
  input.value = value;
  const { Event } = input.ownerDocument.defaultView;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function mountTurkishDateTime(dateInput, timeInput) {
  if (!dateInput?.closest('label') || !timeInput?.closest('label')) return null;
  const document = dateInput.ownerDocument;
  const minimum = dateInput.min;
  const maximum = dateInput.max;
  const dateField = fieldsetFor(dateInput);
  const timeField = fieldsetFor(timeInput);

  const details = document.createElement('details');
  details.className = 'turkish-calendar';
  details.innerHTML = [
    '<summary class="turkish-calendar-trigger">Tarih seç</summary>',
    '<div class="turkish-calendar-panel">',
    '<div class="turkish-calendar-heading">',
    '<button type="button" data-previous aria-label="Önceki ay">‹</button>',
    '<strong aria-live="polite"></strong>',
    '<button type="button" data-next aria-label="Sonraki ay">›</button>',
    '</div>',
    '<div class="turkish-calendar-week" aria-hidden="true">',
    weekdays.map(day => '<span>' + day + '</span>').join(''),
    '</div>',
    '<div class="turkish-calendar-days"></div>',
    '<button type="button" class="turkish-calendar-clear">Tarihi temizle</button>',
    '</div>',
  ].join('');
  dateField.append(details);
  const trigger = details.querySelector('summary');
  const previous = details.querySelector('[data-previous]');
  const next = details.querySelector('[data-next]');
  const title = details.querySelector('strong');
  const days = details.querySelector('.turkish-calendar-days');
  const clear = details.querySelector('.turkish-calendar-clear');
  let month;

  function chooseDate(value) {
    selectValue(dateInput, value);
    trigger.textContent = value ? formatDate.format(asDate(value)) : 'Tarih seç';
    details.open = false;
    trigger.focus();
  }

  function renderCalendar() {
    const year = month.getUTCFullYear();
    const index = month.getUTCMonth();
    const prefix = year + '-' + pad(index + 1) + '-';
    const daysInMonth = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    title.textContent = formatMonth.format(month);
    previous.disabled = Boolean(minimum && prefix + '01' <= minimum);
    next.disabled = Boolean(maximum && prefix + pad(daysInMonth) >= maximum);
    clear.hidden = !dateInput.value;
    const content = document.createDocumentFragment();
    const firstDay = (month.getUTCDay() + 6) % 7;
    for (let i = 0; i < firstDay; i++) content.append(document.createElement('span'));
    for (let day = 1; day <= daysInMonth; day++) {
      const value = prefix + pad(day);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(day);
      button.setAttribute('aria-label', formatDate.format(asDate(value)));
      button.setAttribute('aria-pressed', String(dateInput.value === value));
      button.disabled = Boolean((minimum && value < minimum) || (maximum && value > maximum));
      button.addEventListener('click', () => chooseDate(value));
      content.append(button);
    }
    days.replaceChildren(content);
  }

  function moveMonth(offset) {
    month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
    renderCalendar();
  }

  details.addEventListener('toggle', () => {
    if (!details.open) return;
    const anchor = dateInput.value ? asDate(dateInput.value) : new Date();
    month = new Date(Date.UTC(
      dateInput.value ? anchor.getUTCFullYear() : anchor.getFullYear(),
      dateInput.value ? anchor.getUTCMonth() : anchor.getMonth(),
      1,
    ));
    renderCalendar();
  });
  details.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !details.open) return;
    event.preventDefault();
    event.stopPropagation();
    details.open = false;
    trigger.focus();
  });
  previous.addEventListener('click', () => moveMonth(-1));
  next.addEventListener('click', () => moveMonth(1));
  clear.addEventListener('click', () => chooseDate(''));

  const timeControls = document.createElement('div');
  timeControls.className = 'turkish-time-parts';
  const options = count => Array.from({ length: count }, (_, i) => '<option>' + pad(i) + '</option>').join('');
  timeControls.innerHTML = [
    '<label>Saat<select><option value="">Saat seç</option>', options(24), '</select></label>',
    '<label>Dakika<select>', options(60), '</select></label>',
  ].join('');
  timeField.append(timeControls);
  const [hours, minutes] = timeControls.querySelectorAll('select');
  function updateTime() {
    minutes.disabled = !hours.value;
    if (!hours.value) minutes.value = '00';
    selectValue(timeInput, hours.value ? hours.value + ':' + minutes.value : '');
  }
  hours.addEventListener('change', updateTime);
  minutes.addEventListener('change', updateTime);

  function refresh() {
    trigger.textContent = dateInput.value ? formatDate.format(asDate(dateInput.value)) : 'Tarih seç';
    details.open = false;
    const [hour = '', minute = '00'] = timeInput.value.split(':');
    hours.value = hour;
    minutes.value = minute;
    minutes.disabled = !hour;
  }
  refresh();
  return { dateButton: trigger, refresh };
}

if (typeof document !== 'undefined') {
  const schedule = document.querySelector('[data-turkish-date-time]');
  if (schedule) mountTurkishDateTime(schedule.querySelector('[name="date"]'), schedule.querySelector('[name="time"]'));
}

UPDATE source_catalogue SET state='retired', last_state_change=unixepoch()*1000,
  state_reason='Broad feed repeatedly contributed car-show promotions and device reviews; reconsider a reliable AI-specific feed in future.'
WHERE id='ifanr';

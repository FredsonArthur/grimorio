import { useState } from 'react';
import { ABILITIES, SKILLS, SIZES, DEFAULT_DATA, modifier, signed } from '../dnd';

// Converte os campos numéricos (que o formulário guarda como texto) e limpa ataques sem nome
function prepararDados(type, d) {
  const abilities = Object.fromEntries(ABILITIES.map(({ key }) => [key, Number(d.abilities[key])]));

  if (type === 'PLAYER') {
    return {
      ...d,
      level: Number(d.level),
      xp: Number(d.xp),
      abilities,
      hp: { max: Number(d.hp.max), current: Number(d.hp.current), temp: Number(d.hp.temp) },
      ac: Number(d.ac),
      attacks: d.attacks.filter((a) => a.name.trim() !== ''),
    };
  }

  return {
    ...d,
    abilities,
    hp: { max: Number(d.hp.max), current: Number(d.hp.current) },
    ac: Number(d.ac),
  };
}

export default function CharacterForm({ type, initial, submitLabel, onSubmit, onCancel }) {
  const isPlayer = type === 'PLAYER';
  const [name, setName] = useState(initial?.name ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [data, setData] = useState(initial?.data ?? DEFAULT_DATA[type]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (e) => setData((d) => ({ ...d, [field]: e.target.value }));
  const setNested = (group, field) => (e) =>
    setData((d) => ({ ...d, [group]: { ...d[group], [field]: e.target.value } }));
  const toggle = (field, key) => () =>
    setData((d) => ({
      ...d,
      [field]: d[field].includes(key) ? d[field].filter((k) => k !== key) : [...d[field], key],
    }));

  const setAttack = (index, field) => (e) =>
    setData((d) => ({
      ...d,
      attacks: d.attacks.map((a, i) => (i === index ? { ...a, [field]: e.target.value } : a)),
    }));
  const addAttack = () =>
    setData((d) => ({ ...d, attacks: [...d.attacks, { name: '', bonus: '', damage: '' }] }));
  const removeAttack = (index) =>
    setData((d) => ({ ...d, attacks: d.attacks.filter((_, i) => i !== index) }));

  const input = (field, label, extra = {}) => (
    <label>
      {label}
      <input value={data[field]} onChange={setField(field)} {...extra} />
    </label>
  );

  const area = (field, label, hint, rows = 4) => (
    <label>
      {label}
      <textarea value={data[field]} onChange={setField(field)} rows={rows} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ name, imageUrl, data: prepararDados(type, data) });
    } catch (err) {
      setError(err.details?.[0]?.mensagem || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}

      <fieldset className="form-section">
        <legend>{isPlayer ? 'Personagem' : 'Criatura'}</legend>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </label>
        <label>
          Imagem (link)
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://exemplo.com/retrato.jpg"
          />
          <span className="hint">Opcional.</span>
        </label>

        {isPlayer ? (
          <div className="form-grid">
            {input('race', 'Raça', { maxLength: 40 })}
            {input('class', 'Classe', { maxLength: 40 })}
            {input('subclass', 'Subclasse', { maxLength: 40 })}
            {input('background', 'Antecedente', { maxLength: 40 })}
            {input('alignment', 'Tendência', { maxLength: 30 })}
            <label>
              Nível
              <input type="number" min={1} max={20} value={data.level} onChange={setField('level')} required />
            </label>
            <label>
              Pontos de experiência
              <input type="number" min={0} value={data.xp} onChange={setField('xp')} required />
            </label>
          </div>
        ) : (
          <div className="form-grid">
            {input('creatureType', 'Tipo de criatura', { maxLength: 60, placeholder: 'Ex.: Humanoide (goblinoide)' })}
            <label>
              Tamanho
              <select value={data.size} onChange={setField('size')}>
                {Object.entries(SIZES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {input('challenge', 'Nível de desafio (ND)', { maxLength: 10, placeholder: 'Ex.: 1/4' })}
          </div>
        )}
      </fieldset>

      <fieldset className="form-section">
        <legend>Atributos</legend>
        <div className="abilities-edit">
          {ABILITIES.map(({ key, label }) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={1}
                max={30}
                value={data.abilities[key]}
                onChange={setNested('abilities', key)}
                required
              />
              <span className="hint">Modificador: {signed(modifier(data.abilities[key] || 10))}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Combate</legend>
        <div className="form-grid">
          <label>
            Classe de Armadura (CA)
            <input type="number" min={0} max={40} value={data.ac} onChange={setField('ac')} required />
          </label>
          {input('speed', 'Deslocamento', { maxLength: isPlayer ? 40 : 80 })}
          <label>
            Vida máxima
            <input type="number" min={0} value={data.hp.max} onChange={setNested('hp', 'max')} required />
          </label>
          <label>
            Vida atual
            <input type="number" min={0} value={data.hp.current} onChange={setNested('hp', 'current')} required />
          </label>
          {isPlayer && (
            <label>
              Vida temporária
              <input type="number" min={0} value={data.hp.temp} onChange={setNested('hp', 'temp')} required />
            </label>
          )}
        </div>
      </fieldset>

      {isPlayer && (
        <>
          <fieldset className="form-section">
            <legend>Salvaguardas treinadas</legend>
            <div className="check-grid">
              {ABILITIES.map(({ key, label }) => (
                <label key={key} className="check">
                  <input
                    type="checkbox"
                    checked={data.savingThrows.includes(key)}
                    onChange={toggle('savingThrows', key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Perícias treinadas</legend>
            <div className="check-grid">
              {SKILLS.map((skill) => (
                <label key={skill.key} className="check">
                  <input
                    type="checkbox"
                    checked={data.skills.includes(skill.key)}
                    onChange={toggle('skills', skill.key)}
                  />
                  {skill.label}
                  <span className="hint">({ABILITIES.find((a) => a.key === skill.ability).short})</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Ataques</legend>
            {data.attacks.map((attack, i) => (
              <div className="attack-row" key={i}>
                <input
                  placeholder="Nome (ex.: Espada longa)"
                  value={attack.name}
                  onChange={setAttack(i, 'name')}
                  maxLength={60}
                />
                <input placeholder="Bônus (+5)" value={attack.bonus} onChange={setAttack(i, 'bonus')} maxLength={10} />
                <input
                  placeholder="Dano (1d8+3 cortante)"
                  value={attack.damage}
                  onChange={setAttack(i, 'damage')}
                  maxLength={40}
                />
                <button type="button" className="ghost" onClick={() => removeAttack(i)}>
                  Remover
                </button>
              </div>
            ))}
            <div className="actions">
              <button type="button" className="ghost" onClick={addAttack}>Adicionar ataque</button>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Anotações</legend>
            {area('equipment', 'Equipamento e tesouros')}
            {area('spells', 'Magias')}
            {area('features', 'Características e habilidades')}
            {area('notes', 'Personalidade, história e outras anotações')}
          </fieldset>
        </>
      )}

      {!isPlayer && (
        <fieldset className="form-section">
          <legend>Detalhes da criatura</legend>
          {input('senses', 'Sentidos', { maxLength: 200, placeholder: 'Ex.: Visão no escuro 18 m, Percepção passiva 9' })}
          {input('languages', 'Idiomas', { maxLength: 200 })}
          {area('traits', 'Traços')}
          {area('actions', 'Ações')}
          {area('notes', 'Anotações secretas do mestre', 'Só o mestre vê este campo; os jogadores nunca o recebem.')}
        </fieldset>
      )}

      <div className="actions">
        <button disabled={submitting}>{submitting ? 'Salvando...' : submitLabel}</button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
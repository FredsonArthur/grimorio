import { useState } from 'react';
import { SYSTEMS, CAMPAIGN_TYPES } from '../roomOptions';

export default function RoomForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    coverUrl: initial?.coverUrl ?? '',
    system: initial?.system ?? 'dnd5e',
    campaignType: initial?.campaignType ?? 'campaign',
    startingLevel: initial?.startingLevel ?? 1,
    maxPlayers: initial?.maxPlayers ?? 6,
    schedule: initial?.schedule ?? '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const validCover = /^https?:\/\/\S+$/i.test(values.coverUrl);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        startingLevel: Number(values.startingLevel),
        maxPlayers: Number(values.maxPlayers),
      });
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
        <legend>Sobre a mesa</legend>
        <label>
          Nome da sala
          <input value={values.name} onChange={set('name')} maxLength={60} required />
        </label>
        <label>
          Descrição
          <textarea value={values.description} onChange={set('description')} maxLength={500} rows={4} />
          <span className="hint">Conte o tema, o tom e o que os jogadores podem esperar. Até 500 caracteres.</span>
        </label>
        <label>
          Imagem de capa (link)
          <input
            type="url"
            value={values.coverUrl}
            onChange={set('coverUrl')}
            placeholder="https://exemplo.com/capa.jpg"
          />
          <span className="hint">Opcional. Cole o endereço de uma imagem da internet.</span>
        </label>
        {validCover && (
          <img
            key={values.coverUrl}
            className="cover-preview"
            src={values.coverUrl}
            alt="Prévia da capa"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
      </fieldset>

      <fieldset className="form-section">
        <legend>Regras e jogo</legend>
        <div className="form-grid">
          <label>
            Sistema de regras
            <select value={values.system} onChange={set('system')}>
              {Object.entries(SYSTEMS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo de jogo
            <select value={values.campaignType} onChange={set('campaignType')}>
              {Object.entries(CAMPAIGN_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Nível inicial dos personagens
            <input type="number" min={1} max={20} value={values.startingLevel} onChange={set('startingLevel')} required />
          </label>
          <label>
            Máximo de jogadores
            <input type="number" min={1} max={12} value={values.maxPlayers} onChange={set('maxPlayers')} required />
          </label>
        </div>
        <span className="hint">O mestre não conta no limite de jogadores.</span>
      </fieldset>

      <fieldset className="form-section">
        <legend>Agenda</legend>
        <label>
          Quando vocês jogam?
          <input
            value={values.schedule}
            onChange={set('schedule')}
            maxLength={80}
            placeholder="Ex.: sábados às 20h"
          />
          <span className="hint">Opcional.</span>
        </label>
      </fieldset>

      <div className="actions">
        <button disabled={submitting}>{submitting ? 'Salvando...' : submitLabel}</button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
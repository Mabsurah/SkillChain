import React, { useState, useEffect } from 'react';
import { 
  Database, Zap, Search, Eye, Layers, Terminal, 
  RefreshCw, ShieldAlert, Play, CheckCircle2, AlertTriangle, 
  Clock, Server, Copy, Check, Code, Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import './QueryStudio.css';

const QueryStudio = () => {
  const [activeTab, setActiveTab] = useState('function');
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  // Tab 1: Function Inputs
  const [selectedFunction, setSelectedFunction] = useState('GET_PARTICIPANT_CREDIT_TIER');
  const [funcParticipantId, setFuncParticipantId] = useState('P003');
  const [funcCourseId, setFuncCourseId] = useState('C001');
  const [funcDiscountPct, setFuncDiscountPct] = useState(15);

  // Tab 2: Subquery Inputs
  const [subqueryType, setSubqueryType] = useState('SCALAR_COMPARISON');

  // Tab 3: View Inputs
  const [selectedView, setSelectedView] = useState('v_course_analytics');

  // Tab 4: ADT Inputs
  const [adtParticipantId, setAdtParticipantId] = useState('P001');

  // Tab 5: PL/SQL Inputs
  const [plsqlPid, setPlsqlPid] = useState('P001');
  const [plsqlCid, setPlsqlCid] = useState('C004');

  // Tab 6: Cursor Inputs
  const [cursorMinPrice, setCursorMinPrice] = useState(1200);

  // Tab 7: Exception Inputs
  const [exceptionPid, setExceptionPid] = useState('P001');
  const [exceptionAmount, setExceptionAmount] = useState(100);
  const [triggerExceptionError, setTriggerExceptionError] = useState(false);

  // Tab 8: Custom SQL Console
  const [customSql, setCustomSql] = useState('SELECT course_id, course_title, price, status FROM course ORDER BY price DESC');

  useEffect(() => {
    // Check Health & DB status
    api.getHealth().then(res => {
      if (res && res.database) {
        setDbStatus(res.database);
      }
    }).catch(() => {});
  }, []);

  const handleCopySql = (sqlText) => {
    if (!sqlText) return;
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunQuery = async () => {
    setLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      let res;
      switch (activeTab) {
        case 'function':
          res = await api.runFunction({
            functionName: selectedFunction,
            params: {
              participant_id: funcParticipantId,
              course_id: funcCourseId,
              discount_pct: Number(funcDiscountPct)
            }
          });
          break;
        case 'subquery':
          res = await api.runSubquery({ subqueryType });
          break;
        case 'view':
          res = await api.runView(selectedView);
          break;
        case 'adt':
          res = await api.runAdt({ participantId: adtParticipantId });
          break;
        case 'plsql':
          res = await api.runPlsql({ participantId: plsqlPid, courseId: plsqlCid });
          break;
        case 'cursor':
          res = await api.runCursor({ minPrice: cursorMinPrice });
          break;
        case 'exception':
          res = await api.runException({
            participantId: exceptionPid,
            amount: Number(exceptionAmount),
            triggerError: triggerExceptionError
          });
          break;
        case 'custom':
          res = await api.runCustomSql(customSql);
          break;
        default:
          break;
      }
      setQueryResult(res);
    } catch (err) {
      setError(err.message || 'Error executing database query.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    { label: 'All Courses', sql: 'SELECT course_id, course_title, course_level, price, status FROM course' },
    { label: 'All Users & Passwords', sql: 'SELECT email, password FROM users' },
    { label: 'Course Analytics View', sql: 'SELECT * FROM v_course_analytics' },
    { label: 'Participant Overview View', sql: 'SELECT * FROM v_participant_overview' },
    { label: 'Skills Catalog', sql: 'SELECT skill_id, skill_name, skill_tier FROM skill' },
    { label: 'Certificates List', sql: 'SELECT certificate_id, participant_id, issue_date FROM certificate' }
  ];

  return (
    <div className="qs-container">
      
      {/* Header */}
      <div className="qs-header">
        <div className="qs-header-top">
          <div className="qs-header-icon">
            <Database size={26} color="#ffffff" />
          </div>
          <div style={{ flex: 1 }}>
            <h2>Database & SQL Studio</h2>
            <p>Live interactive Oracle SQL & PL/SQL Query Engine connected to Oracle Database 11g (XE)</p>
          </div>

          <div className="qs-live-db-badge">
            <span className="qs-status-indicator online"></span>
            <span>Oracle 11g XE • User: {dbStatus?.user || 'SKILLCHAIN'} • {dbStatus?.connected ? 'Live Connected' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* 8 Tabs */}
      <div className="qs-tabs">
        <button className={`qs-tab-btn ${activeTab === 'function' ? 'active' : ''}`} onClick={() => { setActiveTab('function'); setQueryResult(null); }}>
          <Zap size={16} /> 1. PL/SQL Function
        </button>
        <button className={`qs-tab-btn ${activeTab === 'subquery' ? 'active' : ''}`} onClick={() => { setActiveTab('subquery'); setQueryResult(null); }}>
          <Search size={16} /> 2. Subqueries
        </button>
        <button className={`qs-tab-btn ${activeTab === 'view' ? 'active' : ''}`} onClick={() => { setActiveTab('view'); setQueryResult(null); }}>
          <Eye size={16} /> 3. Database View
        </button>
        <button className={`qs-tab-btn ${activeTab === 'adt' ? 'active' : ''}`} onClick={() => { setActiveTab('adt'); setQueryResult(null); }}>
          <Layers size={16} /> 4. Abstract Datatype (ADT)
        </button>
        <button className={`qs-tab-btn ${activeTab === 'plsql' ? 'active' : ''}`} onClick={() => { setActiveTab('plsql'); setQueryResult(null); }}>
          <Terminal size={16} /> 5. PL/SQL Block / Proc
        </button>
        <button className={`qs-tab-btn ${activeTab === 'cursor' ? 'active' : ''}`} onClick={() => { setActiveTab('cursor'); setQueryResult(null); }}>
          <RefreshCw size={16} /> 6. Explicit Cursor
        </button>
        <button className={`qs-tab-btn ${activeTab === 'exception' ? 'active' : ''}`} onClick={() => { setActiveTab('exception'); setQueryResult(null); }}>
          <ShieldAlert size={16} /> 7. Exception Handling
        </button>
        <button className={`qs-tab-btn qs-custom-tab-btn ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => { setActiveTab('custom'); setQueryResult(null); }}>
          <Code size={16} /> 8. Custom SQL Console
        </button>
      </div>

      {/* MAIN QUERY CARD */}
      <div className="qs-card">
        
        {/* TAB 1: PL/SQL FUNCTION */}
        {activeTab === 'function' && (
          <div>
            <div className="qs-card-title-row">
              <h3>PL/SQL Stored Functions</h3>
              <span className="qs-badge qs-badge-function">Function Query</span>
            </div>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Select Function</label>
                <select className="qs-select" value={selectedFunction} onChange={(e) => setSelectedFunction(e.target.value)}>
                  <option value="GET_PARTICIPANT_CREDIT_TIER">get_participant_credit_tier(p_pid)</option>
                  <option value="CALCULATE_COURSE_DISCOUNT">calculate_course_discount(p_cid, p_pct)</option>
                </select>
              </div>

              {selectedFunction === 'GET_PARTICIPANT_CREDIT_TIER' ? (
                <div className="qs-param-item">
                  <label>Participant ID</label>
                  <select className="qs-select" value={funcParticipantId} onChange={(e) => setFuncParticipantId(e.target.value)}>
                    <option value="P001">P001 (Rahim - 500 Credits)</option>
                    <option value="P002">P002 (Sadia - 350 Credits)</option>
                    <option value="P003">P003 (Tanvir - 700 Credits)</option>
                    <option value="P004">P004 (Nusrat - 250 Credits)</option>
                    <option value="P005">P005 (Fahim - 900 Credits)</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="qs-param-item">
                    <label>Course ID</label>
                    <select className="qs-select" value={funcCourseId} onChange={(e) => setFuncCourseId(e.target.value)}>
                      <option value="C001">C001 (C++ Programming - $1200)</option>
                      <option value="C002">C002 (Web Development - $1500)</option>
                      <option value="C003">C003 (Python Data Science - $1300)</option>
                      <option value="C004">C004 (Oracle DB Management - $1000)</option>
                      <option value="C005">C005 (Machine Learning - $1800)</option>
                    </select>
                  </div>
                  <div className="qs-param-item">
                    <label>Discount Percentage (%)</label>
                    <input type="number" className="qs-input" value={funcDiscountPct} min="0" max="100" onChange={(e) => setFuncDiscountPct(e.target.value)} />
                  </div>
                </>
              )}
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Executing Function...' : 'Trigger PL/SQL Function'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SUBQUERIES */}
        {activeTab === 'subquery' && (
          <div>
            <div className="qs-card-title-row">
              <h3>SQL Subqueries (Nested & Correlated)</h3>
              <span className="qs-badge qs-badge-subquery">Subquery</span>
            </div>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Select Subquery Scenario</label>
                <select className="qs-select" value={subqueryType} onChange={(e) => setSubqueryType(e.target.value)}>
                  <option value="SCALAR_COMPARISON">1. Scalar Comparison (Credit &gt; Platform AVG Credit)</option>
                  <option value="CORRELATED">2. Correlated Subquery (Course Price &gt;= Skill AVG Price)</option>
                  <option value="SET_MEMBERSHIP">3. Set Membership (Participants with Exam Score &gt;= 90)</option>
                </select>
              </div>
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Executing Subquery...' : 'Execute Subquery'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: DATABASE VIEW */}
        {activeTab === 'view' && (
          <div>
            <div className="qs-card-title-row">
              <h3>Oracle Database Views</h3>
              <span className="qs-badge qs-badge-view">Database View</span>
            </div>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Select Database View</label>
                <select className="qs-select" value={selectedView} onChange={(e) => setSelectedView(e.target.value)}>
                  <option value="v_course_analytics">v_course_analytics (Course + Instructor + Ratings + Enrollments)</option>
                  <option value="v_participant_overview">v_participant_overview (Participant + Credit + Certs + Exam AVG)</option>
                </select>
              </div>
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Querying View...' : 'Query Database View'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: ABSTRACT DATATYPE (ADT) */}
        {activeTab === 'adt' && (
          <div>
            <div className="qs-card-title-row">
              <h3>Oracle Abstract Datatype (ADT / Object Types)</h3>
              <span className="qs-badge qs-badge-adt">ADT Object</span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '16px' }}>
              Demonstrates Oracle User-Defined Object Type <code>t_participant_address</code> with member functions <code>get_formatted_address()</code> and <code>get_short_location()</code>.
            </p>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Select Participant to Instantiate ADT</label>
                <select className="qs-select" value={adtParticipantId} onChange={(e) => setAdtParticipantId(e.target.value)}>
                  <option value="P001">P001 - Rahim Ahmed (Mirpur, Dhaka)</option>
                  <option value="P002">P002 - Sadia Islam (Dhanmondi, Dhaka)</option>
                  <option value="P003">P003 - Tanvir Hossain (Zindabazar, Sylhet)</option>
                  <option value="P004">P004 - Nusrat Jahan (Uttara, Dhaka)</option>
                  <option value="P005">P005 - Fahim Hasan (Kotwali, Chattogram)</option>
                </select>
              </div>
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Executing ADT Query...' : 'Execute ADT Object Query'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: PL/SQL ANONYMOUS BLOCK / PROCEDURE */}
        {activeTab === 'plsql' && (
          <div>
            <div className="qs-card-title-row">
              <h3>PL/SQL Stored Procedure & Anonymous Block</h3>
              <span className="qs-badge qs-badge-plsql">PL/SQL Block</span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '16px' }}>
              Executes stored procedure <code>enroll_participant_proc</code> with IN/OUT bind parameters, validating enrollment, issuing bonus credits, and handling transaction commit.
            </p>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Participant ID (p_pid)</label>
                <select className="qs-select" value={plsqlPid} onChange={(e) => setPlsqlPid(e.target.value)}>
                  <option value="P001">P001 (Rahim Ahmed)</option>
                  <option value="P002">P002 (Sadia Islam)</option>
                  <option value="P003">P003 (Tanvir Hossain)</option>
                  <option value="P004">P004 (Nusrat Jahan)</option>
                </select>
              </div>

              <div className="qs-param-item">
                <label>Course ID (p_cid)</label>
                <select className="qs-select" value={plsqlCid} onChange={(e) => setPlsqlCid(e.target.value)}>
                  <option value="C004">C004 (Oracle Database Management)</option>
                  <option value="C005">C005 (Introduction to Machine Learning)</option>
                  <option value="C001">C001 (Advanced C++ Programming)</option>
                </select>
              </div>
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Running PL/SQL...' : 'Execute PL/SQL Anonymous Block'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: EXPLICIT CURSOR */}
        {activeTab === 'cursor' && (
          <div>
            <div className="qs-card-title-row">
              <h3>Explicit PL/SQL Cursors</h3>
              <span className="qs-badge qs-badge-cursor">Cursor</span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '16px' }}>
              Traverses rows with explicit cursor lifecycle (<code>OPEN</code> &rarr; <code>FETCH</code> &rarr; <code>%NOTFOUND</code> &rarr; <code>CLOSE</code>) to perform batch calculation.
            </p>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Minimum Course Price Filter ($)</label>
                <input type="number" className="qs-input" value={cursorMinPrice} onChange={(e) => setCursorMinPrice(e.target.value)} />
              </div>
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Traversing Cursor...' : 'Run Explicit Cursor Procedure'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: EXCEPTION HANDLING */}
        {activeTab === 'exception' && (
          <div>
            <div className="qs-card-title-row">
              <h3>PL/SQL Exception Handling (User-Defined & Built-in)</h3>
              <span className="qs-badge qs-badge-exception">Exception Handling</span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '16px' }}>
              Tests procedure <code>deduct_participant_credit</code> catching custom exceptions (<code>insufficient_credit_ex</code>, <code>account_frozen_ex</code>) and built-in <code>NO_DATA_FOUND</code>.
            </p>

            <div className="qs-params-grid">
              <div className="qs-param-item">
                <label>Participant ID</label>
                <select className="qs-select" value={exceptionPid} onChange={(e) => setExceptionPid(e.target.value)}>
                  <option value="P001">P001 (Active - Rahim - 500 Credits)</option>
                  <option value="P005">P005 (Frozen/Rejected - Fahim)</option>
                  <option value="P999">P999 (Non-Existent Participant)</option>
                </select>
              </div>

              <div className="qs-param-item">
                <label>Deduction Amount ($)</label>
                <input type="number" className="qs-input" value={exceptionAmount} onChange={(e) => setExceptionAmount(e.target.value)} />
              </div>
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Processing...' : 'Run with Exception Handling'}
              </button>

              <button 
                className="qs-toggle-error-btn" 
                onClick={() => {
                  setTriggerExceptionError(!triggerExceptionError);
                  setExceptionAmount(triggerExceptionError ? 100 : 50000);
                }}
              >
                {triggerExceptionError ? '⚠️ Mode: Trigger Error (Amount: $50,000)' : '✓ Mode: Normal Test (Amount: $100)'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 8: CUSTOM SQL CONSOLE */}
        {activeTab === 'custom' && (
          <div>
            <div className="qs-card-title-row">
              <h3>Live Interactive SQL Console</h3>
              <span className="qs-badge qs-badge-custom">Ad-hoc SQL</span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '12px' }}>
              Type any custom Oracle SQL query or pick a sample template below to execute live against your Oracle Database:
            </p>

            <div className="qs-sample-queries">
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={14} color="#8b5cf6" /> Quick Samples:
              </span>
              {sampleQueries.map((sq, i) => (
                <button key={i} className="qs-sample-chip" onClick={() => setCustomSql(sq.sql)}>
                  {sq.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '14px', marginBottom: '18px' }}>
              <textarea 
                className="qs-textarea"
                rows={4}
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                placeholder="Enter any Oracle SQL statement (e.g. SELECT * FROM course WHERE price > 1000)..."
              />
            </div>

            <div className="qs-action-bar">
              <button className="qs-run-btn" onClick={handleRunQuery} disabled={loading}>
                <Play size={16} /> {loading ? 'Executing Custom SQL...' : 'Run Custom Query on Oracle'}
              </button>
            </div>
          </div>
        )}

        {/* RESULTS & SQL PREVIEW SECTION */}
        {error && (
          <div className="qs-message-box qs-msg-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <AlertTriangle size={18} /> Error Executing Database Query
            </div>
            <p style={{ margin: '6px 0 0 0' }}>{error}</p>
          </div>
        )}

        {queryResult && (
          <div className="qs-results-container">
            
            {/* Header / Metrics */}
            <div className="qs-results-header">
              <h4>Database Output & Execution Details</h4>
              <div className="qs-metrics">
                <span className="qs-metric-tag"><Clock size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {queryResult.executionTimeMs} ms</span>
                <span className="qs-metric-tag"><Server size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {queryResult.source}</span>
                {queryResult.data && <span className="qs-metric-tag">{queryResult.data.length} Rows</span>}
              </div>
            </div>

            {/* Raw SQL Box with Copy Button */}
            {queryResult.sql && (
              <div>
                <div className="qs-code-header">
                  <span>Executed SQL / PL-SQL Statement</span>
                  <button className="qs-copy-btn" onClick={() => handleCopySql(queryResult.sql)}>
                    {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                </div>
                <div className="qs-code-box">{queryResult.sql}</div>
              </div>
            )}

            {/* Bind Results or Summary Message */}
            {queryResult.bindResults && (
              <div className={`qs-message-box ${queryResult.bindResults.V_STATUS.includes('ERROR') ? 'qs-msg-error' : 'qs-msg-success'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  {queryResult.bindResults.V_STATUS.includes('ERROR') ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  <span>Status: {queryResult.bindResults.V_STATUS}</span>
                  {queryResult.exceptionCaught && <span style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>Caught: {queryResult.exceptionCaught}</span>}
                </div>
                <p style={{ margin: '6px 0 0 0' }}>{queryResult.bindResults.V_MSG}</p>
              </div>
            )}

            {/* Cursor Metrics */}
            {queryResult.cursorMetrics && (
              <div className="qs-message-box qs-msg-notice">
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Explicit Cursor Processing Completed</div>
                <div><strong>Fetched Rows:</strong> {queryResult.cursorMetrics.FETCHED_ROWS_COUNT}</div>
                {queryResult.cursorMetrics.TOTAL_CATALOG_VALUE && <div><strong>Total Catalog Valuation:</strong> {queryResult.cursorMetrics.TOTAL_CATALOG_VALUE}</div>}
                <div style={{ marginTop: '6px' }}><strong>Log:</strong> {queryResult.cursorMetrics.AUDIT_LOG}</div>
              </div>
            )}

            {/* Data Table */}
            {queryResult.data && queryResult.data.length > 0 && (
              <div className="qs-table-wrapper" style={{ marginTop: '16px' }}>
                <table className="qs-table">
                  <thead>
                    <tr>
                      {Object.keys(queryResult.data[0]).map((key) => (
                        <th key={key}>{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.data.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx}>{typeof val === 'number' ? val.toLocaleString() : String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default QueryStudio;

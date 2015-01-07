package com.wavemaker.runtime.data.dao.procedure;


import com.wavemaker.common.MessageResource;
import com.wavemaker.common.WMRuntimeException;
import com.wavemaker.common.json.JSONUtils;
import com.wavemaker.common.util.IOUtils;
import com.wavemaker.common.util.StringUtils;
import com.wavemaker.common.util.TypeConversionUtils;
import com.wavemaker.runtime.data.dao.util.ProcedureHelper;
import com.wavemaker.runtime.data.model.*;
import com.wavemaker.runtime.data.util.ProceduresUtils;
import org.hibernate.SQLQuery;
import org.hibernate.Session;
import org.hibernate.dialect.OracleTypesHelper;
import org.hibernate.internal.SessionImpl;
import org.hibernate.transform.Transformers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.hibernate4.HibernateTemplate;

import javax.annotation.PostConstruct;
import java.io.InputStream;
import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class WMProcedureExecutorImpl implements WMProcedureExecutor {
    private static final Logger LOGGER = LoggerFactory.getLogger(WMProcedureExecutorImpl.class);
    private static final String CURSOR = "cursor";
    private HibernateTemplate template = null;
    private String serviceId = null;
    private ProcedureModel procedureModel = null;

    private static final Logger logger = LoggerFactory.getLogger(WMProcedureExecutorImpl.class);

    public HibernateTemplate getTemplate() {
        return template;
    }

    public void setTemplate(HibernateTemplate template) {
        this.template = template;
    }

    public String getServiceId() {
        return serviceId;
    }

    public void setServiceId(String serviceId) {
        this.serviceId = serviceId;
    }

    @PostConstruct
    protected void init() {
        InputStream resourceStream = null;
        try {
            ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
            ClassLoader webAppClassLoader = WMProcedureExecutorImpl.class.getClassLoader();
            resourceStream = contextClassLoader.getResourceAsStream(serviceId + "-procedures.mappings.json");
            if (resourceStream != null) {
                logger.info("Using the file {}-procedures.mappings.json from context classLoader {}", serviceId, contextClassLoader);
            } else {
                logger.warn("Could not find {}-procedures.mappings.json in context classLoader {}", serviceId, contextClassLoader);
                resourceStream = webAppClassLoader.getResourceAsStream(serviceId + "-procedures.mappings.json");
                if(resourceStream != null) {
                    logger.warn("Using the file {}-procedures.mappings.json from webApp classLoader {}", serviceId, webAppClassLoader);
                } else {
                    logger.warn("Could not find {}-procedures.mappings.json in webApp classLoader {} also", serviceId, webAppClassLoader);
                    throw new WMRuntimeException(serviceId + "-procedures.mappings.json file is not found in either of webAppClassLoader or contextClassLoader");
                }
            }
            procedureModel = JSONUtils.toObject(resourceStream, ProcedureModel.class);
        } catch (WMRuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new WMRuntimeException("Failed to map the procedures mapping file", e);
        } finally {
            IOUtils.closeSilently(resourceStream);
        }
    }

    private Procedure getProcedure(String procedureName) {
        for (Procedure procedure : procedureModel.getProcedures()) {
            if (procedure.getName().equals(procedureName)) {
                return procedure;
            }
        }
        throw new WMRuntimeException("Failed to find the named procedure: " + procedureName);
    }

    @Override
    public List<Object> executeNamedProcedure(String procedureName, Map<String, Object> params) {

        Procedure procedure = getProcedure(procedureName);
        try {
            List<CustomProcedureParam> customParameters = new ArrayList<CustomProcedureParam>();

            for (ProcedureParam procedureParam : procedure.getProcedureParams()) {
                CustomProcedureParam customProcedureParam = new CustomProcedureParam(procedureParam.getParamName(), params.get(procedureParam.getParamName()), procedureParam.getProcedureParamType(), procedureParam.getValueType());
                customParameters.add(customProcedureParam);
            }

            return executeProcedure(procedure.getProcedure(), customParameters);
        } catch (Exception e) {
            throw new WMRuntimeException("Failed to execute Named Procedure", e);
        }
    }

    private List<Object> executeProcedure(String procedureString, List<CustomProcedureParam> customParameters) {
        if (!ProceduresUtils.hasOutParam(customParameters)){
            return executeNativeProcedure(procedureString, customParameters);
        }
        else{
            return executeNativeJDBCCall(procedureString, customParameters);
        }
    }

    @Override
    public List<Object> executeCustomProcedure(CustomProcedure customProcedure) {
        List<CustomProcedureParam> procedureParams = prepareParams(customProcedure.getProcedureParams());
        return executeProcedure(customProcedure.getProcedureStr(), procedureParams);

    }

    private List<Object> executeNativeJDBCCall(String procedureStr, List<CustomProcedureParam> customParams) {
        Connection conn = null;
        try {
            Session session = template.getSessionFactory().openSession();
            conn = ((SessionImpl) session).connection();
            List<Integer> cursorPostion = new ArrayList<Integer>();

            SQLQuery sqlProcedure = session.createSQLQuery(procedureStr);
            String[] namedParams = sqlProcedure.getNamedParameters();
            CallableStatement callableStatement = conn.prepareCall(getJDBCConvertedString(procedureStr, namedParams));

            List<Integer> outParams = new ArrayList<Integer>();
            for (int position = 0; position < customParams.size(); position++) {
                CustomProcedureParam procedureParam = customParams.get(position);
                if (ProceduresUtils.hasOutParamType(procedureParam)) {

                    LOGGER.info("Found out Parameter " + procedureParam.getParamName());
                    String typeName = StringUtils.splitPackageAndClass(procedureParam.getValueType()).v2;
                    Integer typeCode = getTypeCode(typeName);
                    LOGGER.info("Found type code to be "+ typeCode);
                    callableStatement.registerOutParameter(position + 1, typeCode);

                    if(typeName.equalsIgnoreCase(CURSOR)){
                        cursorPostion.add(position + 1);

                    }else{
                        outParams.add(position + 1);
                    }
                }
                if (procedureParam.getProcedureParamType().equals(ProcedureParamType.IN) || procedureParam.getProcedureParamType().equals(ProcedureParamType.IN_OUT)) {
                    callableStatement.setObject(position + 1, procedureParam.getParamValue());
                }
            }

            LOGGER.info("Executing Procedure [ " + procedureStr +" ]");
            callableStatement.execute();

            Map<String,Object> outData = new LinkedHashMap<String, Object>();
            for (Integer outParam : outParams) {
                outData.put(customParams.get(outParam-1).getParamName(), callableStatement.getObject(outParam));
            }

            for(Integer cursorIndex :cursorPostion){
                outData.put(customParams.get(cursorIndex-1).getParamName(), processCursor(callableStatement.getObject(cursorIndex)));
            }

            List responseWrapper = new ArrayList<Object>();
            responseWrapper.add(outData);
            return responseWrapper;
        } catch (Exception e) {
            throw new WMRuntimeException("Failed to execute procedure ", e);
        }finally {
            if(conn != null){
                try {
                    conn.close();
                } catch (SQLException e) {
                    throw new WMRuntimeException("Failed to close connection", e);
                }
            }
        }
    }

    private List<Object> processCursor(Object resultSet) {
        ResultSet rset = (ResultSet)resultSet;
        List<Object> result = new ArrayList<Object>();

        // Dump the cursor
        try {
            while (rset.next ()){
                Map<String,Object> rowData = new LinkedHashMap<String,Object>();
                int colCount = rset.getMetaData().getColumnCount();
                for (int i=1; i <= colCount; i++) {
                    rowData.put(rset.getMetaData().getColumnName(i) ,rset.getObject(i));
                }
                result.add(rowData);
            }
        } catch (SQLException e) {

            throw new WMRuntimeException("Failed to process cursor ", e);
        }

        return result;
    }

    private Integer getTypeCode(String typeName) throws IllegalAccessException, NoSuchFieldException {
        Integer typeCode;
        if(typeName.equalsIgnoreCase(CURSOR)){
            typeCode = OracleTypesHelper.INSTANCE.getOracleCursorTypeSqlType();
        } else{
            typeCode = typeName.equals("String") ? Types.VARCHAR : (Integer) Types.class.getField(typeName.toUpperCase()).get(null);
        }
        return typeCode;
    }


    private String getJDBCConvertedString(String procedureStr, String[] namedParams) {
        String targetString = procedureStr;
        for (String namedParam : namedParams) {
            targetString = targetString.replace(":" + namedParam, "?");
        }
        return targetString;
    }


    private List<CustomProcedureParam> prepareParams(List<CustomProcedureParam> customProcedureParams) {
        if (customProcedureParams != null && !customProcedureParams.isEmpty()) {
            for (CustomProcedureParam customProcedureParam : customProcedureParams) {
                if(StringUtils.splitPackageAndClass(customProcedureParam.getValueType()).v2.equalsIgnoreCase(CURSOR))
                    continue;
                Object processedParamValue = getValueObject(customProcedureParam);
                if (processedParamValue != null) {
                    customProcedureParam.setParamValue(processedParamValue);
                }
            }
        }
        return customProcedureParams;
    }

    private Object getValueObject(CustomProcedureParam customProcedureParam) {
        Object paramValue;
        try {
            Class loader = Class.forName(customProcedureParam.getValueType());
            paramValue = TypeConversionUtils.fromString(loader, customProcedureParam.getParamValue().toString(), false);
        } catch (IllegalArgumentException ex) {
            LOGGER.error("Failed to Convert param value for procedure", ex);
            throw new WMRuntimeException(MessageResource.QUERY_CONV_FAILURE, ex);
        } catch (ClassNotFoundException ex) {
            throw new WMRuntimeException(MessageResource.CLASS_NOT_FOUND, ex, customProcedureParam.getProcedureParamType());
        }
        return paramValue;
    }

    protected List<Object> executeNativeProcedure(String procedureString, List<CustomProcedureParam> params) {
        Session currentSession = template.getSessionFactory().getCurrentSession();
        SQLQuery sqlProcedure = currentSession.createSQLQuery(procedureString);
        ProcedureHelper.configureParameters(sqlProcedure, params);
        sqlProcedure.setResultTransformer(Transformers.ALIAS_TO_ENTITY_MAP);
        return sqlProcedure.list();
    }


}